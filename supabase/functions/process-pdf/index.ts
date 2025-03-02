
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log("PDF processing function started");
  
  try {
    const formData = await req.formData();
    const pdfFile = formData.get('pdf');
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      console.error("No PDF file provided in the request");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No PDF file uploaded' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`PDF file received: ${pdfFile.name}, size: ${pdfFile.size} bytes, type: ${pdfFile.type}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase environment variables are not properly set");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if pdf_files bucket exists, if not, create it
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error("Error checking buckets:", bucketsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check storage buckets', 
          details: bucketsError 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const pdfBucketExists = buckets?.some(bucket => bucket.name === 'pdf_files');
    
    if (!pdfBucketExists) {
      console.log("Creating pdf_files bucket");
      const { error: createBucketError } = await supabase
        .storage
        .createBucket('pdf_files', { public: false });
      
      if (createBucketError) {
        console.error("Error creating pdf_files bucket:", createBucketError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to create storage bucket', 
            details: createBucketError 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Sanitize filename and generate a unique path for storage
    const sanitizedFileName = pdfFile.name.replace(/[^\x00-\x7F]/g, '');
    const fileExt = sanitizedFileName.split('.').pop() || 'pdf';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFileName = `${timestamp}-${crypto.randomUUID()}.${fileExt}`;
    
    console.log(`Uploading PDF to storage with path: ${uniqueFileName}`);
    
    // Upload the PDF file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('pdf_files')
      .upload(uniqueFileName, pdfFile, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (uploadError) {
      console.error("Error uploading PDF:", uploadError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to upload PDF file', 
          details: uploadError 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const pdfPath = uploadData?.path || uniqueFileName;
    
    console.log("PDF uploaded successfully. Creating job posting record...");
    
    // Create a record in the job_postings table
    const { data: jobData, error: jobError } = await supabase
      .from('job_postings')
      .insert({
        description: `PDF Upload: ${sanitizedFileName}`,
        pdf_path: pdfPath,
        status: 'processing'
      })
      .select('id')
      .single();
    
    if (jobError) {
      console.error("Error creating job posting record:", jobError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create job record', 
          details: jobError 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const jobId = jobData?.id;
    
    if (!jobId) {
      console.error("No job ID returned after insert");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to get job ID' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log(`Job posting created with ID: ${jobId}`);
    
    // Process the PDF content in the background so we can return a response quickly
    setTimeout(async () => {
      try {
        console.log(`Processing PDF content for job ID: ${jobId}`);
        
        // Get a signed URL for the uploaded PDF
        const { data: urlData, error: urlError } = await supabase
          .storage
          .from('pdf_files')
          .createSignedUrl(pdfPath, 60); // 60 seconds expiry
        
        if (urlError || !urlData?.signedUrl) {
          console.error("Error creating signed URL:", urlError);
          await updateJobStatus(supabase, jobId, 'failed', 'Failed to access PDF file');
          return;
        }
        
        const pdfUrl = urlData.signedUrl;
        
        // Invoke scrape-job-posting function to process the PDF
        const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke(
          'scrape-job-posting',
          {
            body: {
              pdfUrl,
              jobId
            }
          }
        );
        
        if (scrapeError) {
          console.error("Error invoking scrape-job-posting function:", scrapeError);
          await updateJobStatus(supabase, jobId, 'failed', 'Failed to process PDF content');
          return;
        }
        
        console.log("PDF processing completed successfully:", scrapeData);
        
        // Update job status to processed
        await updateJobStatus(supabase, jobId, 'processed');
        
      } catch (error) {
        console.error("Error in background processing:", error);
        await updateJobStatus(supabase, jobId, 'failed', error.message);
      }
    }, 0);
    
    // Return success response immediately
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        pdfPath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error("Unexpected error in process-pdf function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to update job status
async function updateJobStatus(supabase, jobId, status, description = null) {
  const updateData = {
    status,
    processed_at: status === 'processed' ? new Date().toISOString() : null
  };
  
  if (description) {
    updateData.description = description;
  }
  
  const { error } = await supabase
    .from('job_postings')
    .update(updateData)
    .eq('id', jobId);
    
  if (error) {
    console.error(`Error updating job status to ${status}:`, error);
  } else {
    console.log(`Job ${jobId} status updated to ${status}`);
  }
}
