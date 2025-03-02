
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting PDF processing");
    const formData = await req.formData();
    const pdfFile = formData.get('pdf');

    if (!pdfFile || !(pdfFile instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: 'No PDF file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing PDF file: ${pdfFile.name}, size: ${pdfFile.size} bytes`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Ensure storage bucket exists
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('pdf_uploads');
    if (bucketError && bucketError.message.includes('The resource was not found')) {
      console.log("Bucket not found, creating...");
      const { error: createBucketError } = await supabase.storage.createBucket('pdf_uploads', {
        public: false,
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create storage bucket', details: createBucketError }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Generate a unique ID for the PDF file
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const fileId = `${timestamp}_${random}`;
    
    // Create a unique path for the file
    const filePath = `uploads/${fileId}.pdf`;

    // Upload the PDF file to Storage
    const { error: uploadError } = await supabase.storage
      .from('pdf_uploads')
      .upload(filePath, pdfFile, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload PDF file', details: uploadError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log("PDF uploaded successfully to storage");

    // Since we can't directly parse the PDF content in this environment due to library limitations,
    // we'll create a job record that will be processed by the scrape-job-posting function
    // The scrape-job-posting function should already have code to handle the job description
    
    // Create content with the file reference - the UI already shows the filename
    const fileContent = `PDF File Reference: ${filePath}\nFilename: ${pdfFile.name}`;
    
    // Create a job posting record for the PDF
    const { data: jobData, error: jobError } = await supabase
      .from('job_postings')
      .insert({
        content: fileContent,
        description: `PDF Upload: ${pdfFile.name}`,
        status: 'pending',
        pdf_path: filePath,
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('Error creating job posting:', jobError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create job posting record', details: jobError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const jobId = jobData.id;
    console.log("Job record created with ID:", jobId);

    // Invoke the scrape-job-posting function to handle text extraction and keyword processing
    try {
      console.log("Invoking scrape-job-posting function");
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke("scrape-job-posting", {
        body: { 
          jobId: jobId,
          processPdf: true
        }
      });
      
      if (scrapeError) {
        console.error("Error invoking scrape-job-posting:", scrapeError);
        // We'll continue despite error since the job has been created and processing can be retried
      } else {
        console.log("scrape-job-posting function response:", scrapeData);
        
        // If we have keywords from the function, include them in the response
        if (scrapeData?.keywords && scrapeData.keywords.length > 0) {
          return new Response(
            JSON.stringify({
              success: true,
              jobId: jobId,
              keywords: scrapeData.keywords,
              pdfPath: filePath,
              fileName: pdfFile.name,
              message: 'PDF processed successfully and keywords extracted'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (invokeError) {
      console.error("Unexpected error invoking scrape-job-posting:", invokeError);
      // Continue despite error since the job has been created
    }

    // If we didn't get keywords from the function or there was an error,
    // just return the job ID so the UI can poll for updates
    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobId,
        pdfPath: filePath,
        fileName: pdfFile.name,
        message: 'PDF uploaded successfully, processing started'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in parse-pdf function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
