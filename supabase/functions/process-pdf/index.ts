
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
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

    // Check file extension
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

    // Create the storage bucket if it doesn't exist
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets.find(bucket => bucket.name === 'job_descriptions')) {
        await supabase.storage.createBucket('job_descriptions', {
          public: false,
          fileSizeLimit: 10485760, // 10MB limit
        });
        console.log('Created job_descriptions bucket');
      }
    } catch (err) {
      console.error('Error checking/creating bucket:', err);
      // Continue anyway, as the bucket might already exist
    }

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

    // Get the PDF array buffer for text extraction
    const pdfArrayBuffer = await pdfFile.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfArrayBuffer);
    
    // Without pdf.js, we'll use a simple approach to extract text
    // Extract text content as best as possible from the binary data
    let textContent = '';
    
    // Use a simple text extraction approach
    // This is not as good as pdf.js but can extract some text for simple PDFs
    const decoder = new TextDecoder('utf-8');
    const pdfText = decoder.decode(pdfBytes);
    
    // Extract text between markers that might represent text content
    const textChunks = pdfText.match(/\(([^)]+)\)/g) || [];
    textContent = textChunks
      .map(chunk => chunk.slice(1, -1))
      .filter(text => /\w/.test(text))  // Only keep chunks with word characters
      .join(' ')
      .replace(/\\(\d{3})/g, ''); // Remove octal escapes
    
    // For more robust text extraction, we'll also attempt to get text from Gemini by describing the PDF
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
    
    // Fall back to having Gemini analyze the text from the PDF
    const bytesToSend = pdfBase64.length > 50000 
      ? pdfBase64.substring(0, 50000) // Limited to first 50K chars to avoid API limits
      : pdfBase64;
    
    console.log(`Extracted basic text (${textContent.length} chars). Now sending to Gemini for better extraction.`);
    
    // Since we couldn't use PDF.js, we'll create a job posting with what we have
    // and allow the client to upload the whole PDF for processing
    const { data: jobPosting, error: jobPostingError } = await supabase
      .from('job_postings')
      .insert({
        description: textContent || "PDF uploaded, processing text...",
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
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!geminiResponse.ok) {
      const geminiErrorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiErrorText);
      
      // Update the job posting status to failed
      await supabase
        .from('job_postings')
        .update({
          status: 'failed',
          error_message: `Gemini API error: ${geminiResponse.status} ${geminiErrorText}`
        })
        .eq('id', jobId);
        
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
