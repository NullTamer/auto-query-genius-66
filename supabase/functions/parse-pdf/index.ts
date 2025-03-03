
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Document } from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm';

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
    console.log('Received request to parse PDF');
    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as File;
    
    if (!pdfFile) {
      console.error('No PDF file was provided in the request');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No PDF file provided'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing PDF file: ${pdfFile.name}, size: ${pdfFile.size} bytes`);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user ID from request (if provided)
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      try {
        // Extract the token without the 'Bearer ' prefix
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError) {
          console.error('Error verifying user:', userError);
        } else if (user) {
          userId = user.id;
          console.log('Authorized user ID:', userId);
        }
      } catch (authError) {
        console.error('Error processing authorization:', authError);
      }
    }
    
    // Create a safe file name
    const fileExtension = pdfFile.name.split('.').pop()?.toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeFileName = `${timestamp}_${Math.random().toString(36).substring(2, 10)}.${fileExtension}`;
    const storagePath = `uploads/${safeFileName}`;
    
    console.log(`Uploading file to storage path: ${storagePath}`);
    
    // Upload PDF to storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('job_pdfs')
      .upload(storagePath, pdfFile, {
        contentType: 'application/pdf',
        upsert: false,
      });
      
    if (storageError) {
      console.error('Storage upload error:', storageError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to upload PDF: ${storageError.message}` 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('File uploaded successfully to storage');
    
    // Extract text content from the PDF
    let pdfText = '';
    try {
      // Use ArrayBuffer for PDF.js
      const arrayBuffer = await pdfFile.arrayBuffer();
      
      // Load the PDF document
      const pdfDocument = await Document.load(arrayBuffer);
      
      // Get the number of pages
      const numPages = pdfDocument.numPages;
      console.log(`PDF has ${numPages} pages`);
      
      // Extract text from each page
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map(item => 'str' in item ? item.str : '')
          .join(' ');
        pdfText += pageText + ' ';
      }
      
      console.log('Successfully extracted text from PDF');
    } catch (extractError) {
      console.error('Error extracting PDF text:', extractError);
      // We'll continue processing even if text extraction fails
      pdfText = 'Failed to extract text content from PDF';
    }
    
    // Create a job posting record
    const { data: jobData, error: jobError } = await supabase
      .from('job_postings')
      .insert({
        content: pdfText.slice(0, 10000), // Limiting content length
        description: pdfText.slice(0, 5000), // Shorter description
        pdf_path: storagePath,
        is_public: true,
        status: 'pending',
        user_id: userId,
        title: pdfFile.name,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
      
    if (jobError) {
      console.error('Database insert error:', jobError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create job record: ${jobError.message}` 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const jobId = jobData.id;
    console.log(`Created job posting with ID: ${jobId}`);
    
    // Process the job description by calling the scrape-job-posting edge function
    try {
      console.log('Invoking scrape-job-posting edge function');
      const processingResponse = await fetch(
        `${supabaseUrl}/functions/v1/scrape-job-posting`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            jobId,
            jobDescription: pdfText,
            userId,
          }),
        }
      );
      
      // Get response from the processing function
      const processingResult = await processingResponse.json();
      console.log('Processing result:', processingResult);
      
      if (!processingResponse.ok) {
        console.error('Processing function returned an error:', processingResult);
      }
      
      // For direct response to the client, we'll extract keywords if available
      // or let the client poll for updates
      let keywords = [];
      if (processingResult.keywords && processingResult.keywords.length > 0) {
        keywords = processingResult.keywords;
        console.log('Keywords extracted from processing:', keywords);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          pdfPath: storagePath,
          fileName: pdfFile.name,
          keywords,
          message: 'PDF uploaded and processing started',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (processingError) {
      console.error('Error invoking processing function:', processingError);
      
      // Even if processing fails, we return success since the upload worked
      // The client can retry processing separately
      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          pdfPath: storagePath,
          fileName: pdfFile.name,
          keywords: [],
          processingError: processingError.message,
          message: 'PDF uploaded but processing failed. You can try refreshing later.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error in parse-pdf function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unexpected error: ${error.message}` 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
