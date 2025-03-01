
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractKeywords } from "./gemini-service.ts";
import { insertJobPosting, updateJobStatus, getJobPosting, insertKeywords } from "./job-repository.ts";
import { sanitizeText } from "./utils.ts";

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
    const { jobDescription, userId } = await req.json();

    // Basic validation
    if (!jobDescription || jobDescription.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, error: 'Job description is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sanitize the job description to remove any problematic characters or formatting
    const sanitizedJobDescription = sanitizeText(jobDescription);

    // Insert into the job_postings table with pending status
    console.log('Inserting job posting');
    const jobId = await insertJobPosting(supabase, {
      content: sanitizedJobDescription,
      user_id: userId || null,
      is_public: true,
      status: 'pending'
    });

    // Define a function to process the job
    const processJob = async () => {
      try {
        console.log(`Processing job ${jobId}`);
        
        // Extract keywords using the Gemini API
        console.log('Extracting keywords using Gemini API');
        const extractedKeywords = await extractKeywords(sanitizedJobDescription);
        
        if (!extractedKeywords || extractedKeywords.length === 0) {
          throw new Error('Failed to extract keywords from job description');
        }
        
        console.log(`Extracted ${extractedKeywords.length} keywords`);
        
        // Insert keywords into the database
        console.log('Inserting keywords into database');
        await insertKeywords(supabase, jobId, extractedKeywords, userId);
        
        // Update job status to processed
        console.log('Updating job status to processed');
        await updateJobStatus(supabase, jobId, 'processed');
        
        console.log(`Job ${jobId} processed successfully`);
        return { success: true, keywords: extractedKeywords };
      } catch (error) {
        console.error(`Error processing job ${jobId}: ${error.message}`);
        
        // Update job status to failed
        await updateJobStatus(supabase, jobId, 'failed', error.message);
        
        throw error;
      }
    };

    // Process job asynchronously using a background task
    let keywordsResult = null;
    try {
      // First attempt to process immediately for better UX
      keywordsResult = await Promise.race([
        processJob(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Processing timeout')), 2000))
      ]);
    } catch (timeoutError) {
      console.log('Processing taking longer than expected, continuing in background');
      // If it takes too long, continue processing in the background
      EdgeRuntime.waitUntil(processJob());
    }

    // Return response with job ID and keywords if available
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        message: keywordsResult ? 'Job processed successfully' : 'Job queued for processing',
        keywords: keywordsResult?.keywords || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in scrape-job-posting:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
