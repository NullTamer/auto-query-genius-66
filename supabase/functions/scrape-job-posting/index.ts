
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processJobPosting } from "./gemini-service.ts";
import { saveKeywords, saveJobPosting } from "./job-repository.ts";
import { extractKeywords } from "./utils.ts";

// Define CORS headers - this is critical for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const { jobDescription } = await req.json();
    
    if (!jobDescription || typeof jobDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid job description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing job posting: ${jobDescription.slice(0, 100)}...`);

    // Save job posting to database
    const jobId = await saveJobPosting(jobDescription);
    
    // Extract keywords using Gemini
    const extractedKeywords = await processJobPosting(jobDescription);
    console.log(`Extracted ${extractedKeywords.length} keywords: ${JSON.stringify(extractedKeywords, null, 2)}`);
    
    // Save keywords to database
    if (extractedKeywords.length > 0) {
      await saveKeywords(jobId, extractedKeywords);
    }

    // Return both the job ID and the extracted keywords
    return new Response(
      JSON.stringify({ 
        id: jobId,
        keywords: extractedKeywords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error processing job posting:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
