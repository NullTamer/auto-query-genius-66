
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { extractKeywords } from '../_shared/keywordExtraction.ts';
import { processJobPosting } from '../_shared/jobProcessing.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let jobDescription = '';
    let pdfFile = null;

    // Handle multipart form data (for PDF uploads)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      pdfFile = formData.get('file') as File;
      jobDescription = formData.get('jobDescription') as string || '';

      if (pdfFile) {
        // Here you would extract text from the PDF
        // This is a placeholder for PDF text extraction
        // You would need to implement PDF parsing logic here
        
        // For now, we'll just use the file name as a placeholder
        console.log(`Processing PDF file: ${pdfFile.name}`);
        
        // If jobDescription is empty but we have a PDF, we could set a placeholder
        if (!jobDescription) {
          jobDescription = `Content extracted from ${pdfFile.name}`;
        }
      }
    } else {
      // Handle JSON request
      const { jobDescription: jsonJobDesc, userId } = await req.json();
      jobDescription = jsonJobDesc;
    }

    if (!jobDescription || jobDescription.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, error: 'No job description provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Process the job posting
    const { jobId, keywords, error } = await processJobPosting(supabaseAdmin, jobDescription);

    if (error) {
      console.error('Error processing job posting:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the job ID and keywords
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        keywords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-job-posting function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
