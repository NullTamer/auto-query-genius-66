
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.mjs';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// Set PDF.js worker source
const pdfjsWorker = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Configure Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configure Gemini API
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Rate limiting and retry settings
const THROTTLE_DELAY_MS = 2000; // 2 seconds between requests
const MAX_RETRIES = 3;

/**
 * Extracts text from a PDF file using PDF.js
 */
async function extractTextFromPdf(pdfData: ArrayBuffer): Promise<string> {
  try {
    // Load the PDF document
    const pdfDocument = await pdfjs.getDocument({ data: pdfData }).promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    console.log(`Extracted ${fullText.length} characters from PDF (${pdfDocument.numPages} pages)`);
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Calls the Gemini API to extract keywords from text
 */
async function extractKeywordsWithGemini(text: string, retryCount = 0): Promise<Array<{keyword: string, frequency: number}>> {
  try {
    // Simple throttling to avoid rate limits
    if (retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY_MS));
    }

    const prompt = `
    Extract the most important technical skills, technologies, frameworks, tools, and requirements from the following job posting.
    Format the response as a JSON array of objects with 'keyword' and 'frequency' properties.
    'frequency' should be a number from 1-5 where 5 is mentioned many times and very important, and 1 is mentioned once.
    Focus on specific technologies (Python, React, etc.), not generic terms like "teamwork" or "fast-paced".
    Return exactly as JSON, no surrounding text or explanation:
    
    ${text}
    `;

    const response = await fetch(`${geminiUrl}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ],
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        },
      }),
    });

    // Handle rate limiting and errors
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      console.log(`Rate limited (429), retrying in ${THROTTLE_DELAY_MS}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      return extractKeywordsWithGemini(text, retryCount + 1);
    }
    
    if (response.status === 404 && retryCount < MAX_RETRIES) {
      console.log(`Resource not found (404), retrying in ${THROTTLE_DELAY_MS}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      return extractKeywordsWithGemini(text, retryCount + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the JSON string from the response
    const responseText = data.candidates[0]?.content?.parts[0]?.text || '';
    
    // Find JSON array in the response
    const match = responseText.match(/\[\s*\{.*\}\s*\]/s);
    if (!match) {
      console.error('Failed to extract JSON from response:', responseText);
      throw new Error('Invalid response format from Gemini API');
    }
    
    try {
      const keywords = JSON.parse(match[0]);
      console.log(`Extracted ${keywords.length} keywords from text`);
      return keywords;
    } catch (parseError) {
      console.error('Error parsing keywords JSON:', parseError, 'Raw text:', responseText);
      throw new Error('Failed to parse keywords from Gemini response');
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Error, retrying in ${THROTTLE_DELAY_MS}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      return extractKeywordsWithGemini(text, retryCount + 1);
    }
    console.error('Error extracting keywords:', error);
    throw error;
  }
}

/**
 * Processes a job posting and extracts keywords
 */
async function processJobPosting(
  jobText: string, 
  userId?: string
): Promise<{ jobId: number, keywords: Array<{keyword: string, frequency: number}> }> {
  try {
    // Insert job posting into database
    const { data: jobData, error: jobError } = await supabase
      .from('job_postings')
      .insert({
        description: jobText,
        status: 'processing',
        user_id: userId || null
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('Error inserting job posting:', jobError);
      throw new Error('Failed to store job posting');
    }

    const jobId = jobData.id;
    console.log(`Created job posting with ID: ${jobId}`);

    try {
      // Extract keywords using Gemini
      const keywords = await extractKeywordsWithGemini(jobText);
      
      // Store extracted keywords
      if (keywords && keywords.length > 0) {
        const keywordInserts = keywords.map(k => ({
          job_posting_id: jobId,
          keyword: k.keyword,
          frequency: k.frequency
        }));

        const { error: keywordError } = await supabase
          .from('extracted_keywords')
          .insert(keywordInserts);

        if (keywordError) {
          console.error('Error inserting keywords:', keywordError);
          throw keywordError;
        }
      }

      // Update job status to 'processed'
      const { error: updateError } = await supabase
        .from('job_postings')
        .update({ 
          status: 'processed',
          processed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error updating job status:', updateError);
        throw updateError;
      }

      return { jobId, keywords };
    } catch (processingError) {
      // Update job status to 'failed'
      await supabase
        .from('job_postings')
        .update({ 
          status: 'failed',
          error_message: processingError.message || 'Unknown error'
        })
        .eq('id', jobId);
        
      throw processingError;
    }
  } catch (error) {
    console.error('Job processing error:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log(`Request received: ${req.method}`);
    
    // Check content type to determine if this is a form data upload
    const contentType = req.headers.get('content-type') || '';
    
    // Handle PDF upload via FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const pdfFile = formData.get('file') as File | null;
      
      if (!pdfFile) {
        return new Response(
          JSON.stringify({ error: 'No PDF file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user ID from form data if available
      const userId = formData.get('userId') as string || undefined;
      
      console.log(`Processing PDF upload: ${pdfFile.name} (${pdfFile.size} bytes)`);
      
      // Upload the PDF to Supabase Storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `${timestamp}-${pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('job_pdfs')
        .upload(filePath, pdfFile, {
          contentType: 'application/pdf',
          upsert: false
        });
        
      if (uploadError) {
        console.error('Error uploading PDF:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload PDF', details: uploadError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Extract text from PDF
      const arrayBuffer = await pdfFile.arrayBuffer();
      const extractedText = await extractTextFromPdf(arrayBuffer);
      
      if (!extractedText || extractedText.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Could not extract text from PDF' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Process the extracted text
      const { jobId, keywords } = await processJobPosting(extractedText, userId);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId, 
          keywords,
          textLength: extractedText.length,
          pdfPath: filePath
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    // Handle regular JSON request
    else {
      const { jobDescription, userId } = await req.json();
      
      if (!jobDescription) {
        return new Response(
          JSON.stringify({ error: 'No job description provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Processing text job description (${jobDescription.length} chars)`);
      
      const { jobId, keywords } = await processJobPosting(jobDescription, userId);
      
      return new Response(
        JSON.stringify({ success: true, jobId, keywords }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in edge function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process job posting',
        message: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
