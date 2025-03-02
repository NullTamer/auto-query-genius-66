
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { extract } from "https://deno.land/x/pdfjs@v0.1.2/mod.ts";
import * as uuid from "https://deno.land/std@0.161.0/uuid/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    // Check if the request is multipart/form-data
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Content-Type must be multipart/form-data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Parse the form data
    const formData = await req.formData();
    const pdfFile = formData.get('pdf');
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: 'No PDF file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing PDF file: ${pdfFile.name}, size: ${pdfFile.size} bytes`);

    // Generate a unique filename for the PDF
    const fileExtension = pdfFile.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'pdf') {
      return new Response(
        JSON.stringify({ success: false, error: 'File must be a PDF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create a unique file path for the PDF
    const pdfFileName = `${uuid.v4()}.pdf`;
    const storagePath = `pdf_uploads/${pdfFileName}`;

    // Upload the PDF to Supabase Storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('job_descriptions')
      .upload(storagePath, pdfFile, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (storageError) {
      console.error('Error uploading PDF to storage:', storageError);
      throw new Error(`Failed to upload PDF: ${storageError.message}`);
    }

    console.log('PDF uploaded successfully to:', storagePath);

    // Get the PDF public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('job_descriptions')
      .getPublicUrl(storagePath);

    // Download the PDF for processing
    const pdfArrayBuffer = await pdfFile.arrayBuffer();
    
    // Extract text from the PDF
    console.log('Extracting text from PDF...');
    let textContent = '';
    try {
      const extracted = await extract(new Uint8Array(pdfArrayBuffer));
      for (const page of extracted.pages) {
        textContent += page.text;
      }
    } catch (extractError) {
      console.error('Error extracting text from PDF:', extractError);
      throw new Error(`Failed to extract text from PDF: ${extractError.message}`);
    }

    if (!textContent.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'No text content found in the PDF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Extracted ${textContent.length} characters from the PDF`);

    // Insert the job posting with the PDF path
    const { data: jobPosting, error: jobPostingError } = await supabase
      .from('job_postings')
      .insert({
        description: textContent,
        status: 'pending',
        pdf_path: storagePath
      })
      .select('id')
      .single();

    if (jobPostingError) {
      console.error('Error inserting job posting:', jobPostingError);
      throw new Error(`Failed to insert job posting: ${jobPostingError.message}`);
    }

    const jobId = jobPosting.id;
    console.log('Job posting created with ID:', jobId);

    // Generate keywords using the Gemini API
    console.log('Generating keywords using Gemini API...');
    
    // Request structure for Gemini API
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Extract all important keywords and skills from the following job description. Focus on technical skills, tools, frameworks, programming languages, and methodologies. Provide the result as a JSON array of objects, each with "keyword" and "frequency" properties. The "frequency" should be a number from 1-5 indicating how important or emphasized each keyword is in the job description:\n\n${textContent}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40
      }
    };

    // Call the Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!geminiResponse.ok) {
      const geminiErrorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiErrorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} ${geminiErrorText}`);
    }

    const geminiData = await geminiResponse.json();
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    let keywordsText = '';
    try {
      keywordsText = geminiData.candidates[0].content.parts[0].text;
    } catch (e) {
      console.error('Error extracting text from Gemini response:', e);
      throw new Error(`Failed to extract keywords: ${e.message}`);
    }

    // Extract the JSON array from the response text
    let keywordsJson;
    try {
      // Find the JSON array in the response
      const jsonMatch = keywordsText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        keywordsJson = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in Gemini response');
      }
    } catch (jsonError) {
      console.error('Error parsing keywords JSON:', jsonError, 'Raw text:', keywordsText);
      // If parsing fails, try a simpler approach - just extract words and frequencies
      const keywords = [];
      const lines = keywordsText.split('\n');
      for (const line of lines) {
        const match = line.match(/["']?(\w+(?:\s+\w+)*)["']?.*?(\d+)/);
        if (match) {
          keywords.push({
            keyword: match[1].trim(),
            frequency: parseInt(match[2], 10)
          });
        }
      }
      
      if (keywords.length > 0) {
        keywordsJson = keywords;
      } else {
        throw new Error('Failed to parse keywords from Gemini response');
      }
    }

    // Validate and process the keywords
    if (!Array.isArray(keywordsJson)) {
      throw new Error('Invalid keywords format from Gemini API');
    }

    const keywords = keywordsJson.map(item => {
      return {
        keyword: item.keyword || '',
        frequency: parseInt(item.frequency || '1', 10) || 1
      };
    }).filter(item => item.keyword.trim() !== '');

    console.log(`Extracted ${keywords.length} keywords from job description`);

    // Insert the keywords into the database
    if (keywords.length > 0) {
      const keywordsToInsert = keywords.map(keyword => ({
        job_posting_id: jobId,
        keyword: keyword.keyword,
        frequency: keyword.frequency
      }));

      const { error: keywordsError } = await supabase
        .from('extracted_keywords')
        .insert(keywordsToInsert);

      if (keywordsError) {
        console.error('Error inserting keywords:', keywordsError);
        throw new Error(`Failed to insert keywords: ${keywordsError.message}`);
      }
    }

    // Update the job posting status to 'processed'
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job posting status:', updateError);
      throw new Error(`Failed to update job posting status: ${updateError.message}`);
    }

    console.log('Job processing completed successfully');

    // Return the response with the job ID and keywords
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        pdfPath: storagePath,
        keywords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing PDF:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
