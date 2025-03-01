
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Constants for rate limiting and retries
const THROTTLE_DELAY_MS = 2000; // 2 seconds between API calls
const MAX_RETRIES = 3;

/**
 * Simple text extraction from PDF using Gemini API
 * We avoid using pdfjs-dist which was causing stack overflow issues
 */
async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string> {
  try {
    // Check if we're dealing with a very large PDF
    if (pdfBytes.length > 10 * 1024 * 1024) { // > 10MB
      console.warn(`PDF is very large (${pdfBytes.length} bytes), this might exceed Gemini's limits`);
      // Return some placeholder text to avoid API errors
      return "The PDF file is too large to process. Please try with a smaller file or extract the text manually.";
    }
    
    // Convert binary PDF to base64
    // Process in chunks to avoid stack overflow
    let base64Pdf = '';
    const chunkSize = 1024 * 1024; // 1MB chunks
    
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      const chunk = pdfBytes.slice(i, Math.min(i + chunkSize, pdfBytes.length));
      base64Pdf += btoa(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    
    console.log(`PDF encoded as base64 (${base64Pdf.length} chars)`);
    
    // Use Gemini to extract text
    const response = await fetch(`${geminiUrl}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { 
                text: "Extract all text content from this PDF. Return only the extracted text without any explanations or formatting." 
              },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Pdf
                }
              }
            ],
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log(`Successfully extracted ${extractedText.length} characters from PDF`);
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract keywords from text using Gemini API
 */
async function extractKeywordsWithGemini(text: string, retryCount = 0): Promise<string[]> {
  try {
    // Truncate very long texts to avoid API limits
    const truncatedText = text.length > 30000 ? text.substring(0, 30000) + "..." : text;
    
    console.log(`Extracting keywords from text (${truncatedText.length} chars)`);
    
    const response = await fetch(`${geminiUrl}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `
You are a skilled talent recruiter and HR professional. Extract all relevant TECHNICAL skills, technologies, frameworks, 
and qualifications from the job description below. Focus ONLY on technical skills, programming languages, tools, etc.

For each keyword you identify, just return the keyword itself.
Format your response as a JSON ARRAY of strings, with each keyword as a separate element.

Example output:
["JavaScript", "React", "Node.js", "AWS", "CI/CD", "Docker"]

Here's the job description:
${truncatedText}` }
            ],
          }
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      if ((response.status === 429 || response.status === 404) && retryCount < MAX_RETRIES) {
        console.log(`Rate limited (${response.status}), retrying after delay... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY_MS));
        return extractKeywordsWithGemini(text, retryCount + 1);
      }
      
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let keywords: string[] = [];
    
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    try {
      // First try to parse directly as JSON
      if (responseText.trim().startsWith('[') && responseText.trim().endsWith(']')) {
        keywords = JSON.parse(responseText);
      } else {
        // If not direct JSON, look for JSON array in the text
        const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          keywords = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback to simple line splitting
          keywords = responseText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('["') && !line.endsWith('"]'));
        }
      }
    } catch (parseError) {
      console.error('Error parsing keywords:', parseError);
      console.log('Raw response:', responseText);
      
      // Final fallback: just split by commas or newlines
      keywords = responseText
        .replace(/["\[\]]/g, '')
        .split(/,|\n/)
        .map(k => k.trim())
        .filter(k => k && k.length > 0);
    }
    
    // Filter out any non-string elements and deduplicate
    keywords = [...new Set(keywords.filter(k => typeof k === 'string' && k.trim().length > 0))];
    
    console.log(`Extracted ${keywords.length} keywords`);
    return keywords;
  } catch (error) {
    console.error('Error extracting keywords:', error);
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying keyword extraction... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, THROTTLE_DELAY_MS));
      return extractKeywordsWithGemini(text, retryCount + 1);
    }
    throw new Error(`Failed to extract keywords: ${error.message}`);
  }
}

/**
 * Save keywords to the database
 */
async function saveKeywordsToDB(jobId: number, keywords: string[], userId?: string): Promise<void> {
  console.log(`Saving ${keywords.length} keywords for job ID ${jobId}`);
  
  try {
    // First, update the job status to processed
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    
    if (updateError) {
      console.error('Error updating job posting status:', updateError);
      throw updateError;
    }
    
    // Now insert all keywords
    const keywordRows = keywords.map(keyword => ({
      job_posting_id: jobId,
      keyword: keyword,
      frequency: 1, // Default frequency
      user_id: userId || null,
      is_public: !userId, // Public if no user ID
    }));
    
    const { error: insertError } = await supabase
      .from('extracted_keywords')
      .insert(keywordRows);
    
    if (insertError) {
      console.error('Error inserting keywords:', insertError);
      throw insertError;
    }
    
    console.log(`Successfully saved keywords for job ID ${jobId}`);
  } catch (error) {
    console.error('Error in saveKeywordsToDB:', error);
    throw new Error(`Failed to save keywords: ${error.message}`);
  }
}

/**
 * Main request handler
 */
serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Safely handle various error scenarios
  try {
    console.log(`Request received: ${req.method}`);
    
    // Handle PDF upload (multipart/form-data)
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      try {
        console.log('Processing PDF upload...');
        const formData = await req.formData();
        const pdfFile = formData.get('file') as File;
        
        if (!pdfFile) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'No PDF file found in request' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        
        console.log(`Processing PDF upload: ${pdfFile.name} (${pdfFile.size} bytes)`);
        
        // Get user ID if available
        const userId = formData.get('userId') as string || null;
        
        // Save file to job_postings table first
        const { data: jobData, error: jobError } = await supabase
          .from('job_postings')
          .insert({
            title: `PDF Upload: ${pdfFile.name}`,
            content: `PDF File: ${pdfFile.name}`,
            description: `PDF uploaded at ${new Date().toISOString()}`,
            status: 'pending',
            user_id: userId,
            is_public: !userId,
          })
          .select()
          .single();
        
        if (jobError) {
          console.error('Error saving job posting:', jobError);
          throw new Error(`Failed to save job posting: ${jobError.message}`);
        }
        
        const jobId = jobData.id;
        
        // Upload file to storage
        try {
          const fileExt = pdfFile.name.split('.').pop() || 'pdf';
          const filePath = `${jobId}_${new Date().getTime()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('job_pdfs')
            .upload(filePath, pdfFile, {
              contentType: 'application/pdf',
              cacheControl: '3600',
            });
          
          if (uploadError) {
            console.error('Error uploading PDF to storage:', uploadError);
          } else {
            console.log(`PDF uploaded to storage: ${filePath}`);
            
            // Update job posting with file path
            await supabase
              .from('job_postings')
              .update({ posting_url: filePath })
              .eq('id', jobId);
          }
        } catch (storageError) {
          console.error('Error in storage operations:', storageError);
          // Continue processing even if storage fails
        }
        
        // Extract text from PDF
        const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());
        const extractedText = await extractTextFromPdf(pdfBytes);
        
        if (!extractedText || extractedText.trim().length === 0) {
          console.error('No text extracted from PDF');
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'No text could be extracted from the PDF',
              jobId 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        
        // Update job content with the extracted text
        await supabase
          .from('job_postings')
          .update({ 
            content: extractedText,
            description: `Text extracted from ${pdfFile.name} (${extractedText.length} characters)`
          })
          .eq('id', jobId);
        
        // Extract keywords
        const keywords = await extractKeywordsWithGemini(extractedText);
        
        // Save keywords to database
        await saveKeywordsToDB(jobId, keywords, userId);
        
        // Return successful response with keywords
        return new Response(
          JSON.stringify({
            success: true,
            jobId,
            keywords,
            textLength: extractedText.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (pdfError) {
        console.error('Error processing PDF:', pdfError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error processing PDF: ${pdfError.message}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Handle regular job description (JSON)
    else {
      try {
        const { jobDescription, userId } = await req.json();
        
        if (!jobDescription) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'No job description provided' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        
        console.log(`Processing job description (${jobDescription.length} chars)`);
        
        // Save to job_postings table
        const { data: jobData, error: jobError } = await supabase
          .from('job_postings')
          .insert({
            content: jobDescription,
            description: jobDescription.substring(0, 200) + (jobDescription.length > 200 ? '...' : ''),
            status: 'pending',
            user_id: userId || null,
            is_public: !userId,
          })
          .select()
          .single();
        
        if (jobError) {
          console.error('Error saving job posting:', jobError);
          throw new Error(`Failed to save job posting: ${jobError.message}`);
        }
        
        const jobId = jobData.id;
        
        // Extract keywords
        const keywords = await extractKeywordsWithGemini(jobDescription);
        
        // Save keywords to database
        await saveKeywordsToDB(jobId, keywords, userId);
        
        // Return successful response with keywords
        return new Response(
          JSON.stringify({
            success: true,
            jobId,
            keywords
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (jsonError) {
        console.error('Error processing job description:', jsonError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Error processing job description: ${jsonError.message}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Unhandled error in serve function:', error);
    return new Response(
      JSON.stringify({ success: false, error: `Server error: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
