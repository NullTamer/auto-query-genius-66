
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

    // Ensure job_descriptions bucket exists
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
    }

    // Upload the PDF to Supabase Storage
    const fileArrayBuffer = await pdfFile.arrayBuffer();
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('job_descriptions')
      .upload(storagePath, fileArrayBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (storageError) {
      console.error('Error uploading PDF to storage:', storageError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to upload PDF: ${storageError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('PDF uploaded successfully to:', storagePath);

    // Get a simple text extraction from the PDF
    // This is just a basic extraction - not as good as using pdf.js
    const decoder = new TextDecoder('utf-8');
    let textContent = '';
    try {
      const pdfText = decoder.decode(new Uint8Array(fileArrayBuffer));
      const textChunks = pdfText.match(/\(([^)]+)\)/g) || [];
      textContent = textChunks
        .map(chunk => chunk.slice(1, -1))
        .filter(text => /\w/.test(text))
        .join(' ')
        .replace(/\\(\d{3})/g, '');
    } catch (error) {
      console.error('Error extracting text:', error);
      textContent = "Text extraction failed, using Gemini to process PDF content";
    }

    // Insert into the job_postings table
    const { data: jobPosting, error: jobPostingError } = await supabase
      .from('job_postings')
      .insert({
        description: textContent || `PDF file: ${pdfFile.name}`,
        status: 'pending',
        pdf_path: storagePath
      })
      .select('id')
      .single();

    if (jobPostingError) {
      console.error('Error inserting job posting:', jobPostingError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create job posting: ${jobPostingError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
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
    let keywords = [];
    try {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!geminiResponse.ok) {
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      
      if (!geminiData.candidates || geminiData.candidates.length === 0) {
        throw new Error('No response from Gemini API');
      }

      const keywordsText = geminiData.candidates[0].content.parts[0].text;
      
      // Extract the JSON array from the response text
      const jsonMatch = keywordsText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedKeywords = JSON.parse(jsonMatch[0]);
        
        keywords = parsedKeywords.map(item => ({
          keyword: item.keyword || '',
          frequency: parseInt(item.frequency || '1', 10) || 1
        })).filter(item => item.keyword.trim() !== '');
      }
    } catch (error) {
      console.error('Error processing with Gemini:', error);
      // Continue without keywords - we'll update the status to let the client know
    }

    // Insert keywords if we got them
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
      }
    }

    // Update the job posting status
    const status = keywords.length > 0 ? 'processed' : 'pending';
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({
        status: status,
        processed_at: status === 'processed' ? new Date().toISOString() : null
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job posting status:', updateError);
    }

    console.log(`Job processing completed with status: ${status}`);

    // Return the response with the job ID and keywords
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        fileName: pdfFile.name,
        pdfPath: storagePath,
        keywords: keywords.length > 0 ? keywords : undefined
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
