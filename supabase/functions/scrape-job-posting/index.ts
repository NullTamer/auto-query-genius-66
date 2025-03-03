
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractKeywords } from "./gemini-service.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Handle JSON parsing errors
function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
}

serve(async (req) => {
  // Set CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request payload
    const payload = await req.json();
    let { jobDescription, userId, jobId } = payload;

    console.log("Received request with payload:", JSON.stringify({
      hasJobDescription: !!jobDescription,
      hasJobId: !!jobId,
      hasUserId: !!userId
    }));

    let jobContent = jobDescription;
    let existingJobId = jobId;

    // If we have a jobId but no jobDescription, fetch the job content from the database
    if (!jobDescription && jobId) {
      console.log(`Fetching job content for job ID: ${jobId}`);
      const { data: jobData, error: jobError } = await supabase
        .from("job_postings")
        .select("content, description")
        .eq("id", jobId)
        .single();

      if (jobError) {
        console.error("Error fetching job posting:", jobError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to fetch job posting: ${jobError.message}` 
          }),
          { headers: corsHeaders, status: 500 }
        );
      }

      // Use content or description, whichever is available
      jobContent = jobData.content || jobData.description;
      if (!jobContent) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Job posting has no content or description" 
          }),
          { headers: corsHeaders, status: 400 }
        );
      }
    }

    // If we don't have a job description or job ID, return an error
    if (!jobContent) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing job description or job ID" 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    // If we have a job description but no job ID, create a new job posting
    if (!existingJobId) {
      console.log("Creating new job posting");
      const { data: jobData, error: jobError } = await supabase
        .from("job_postings")
        .insert({
          description: jobContent,
          user_id: userId,
          status: "pending"
        })
        .select("id")
        .single();

      if (jobError) {
        console.error("Error creating job posting:", jobError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create job posting: ${jobError.message}` 
          }),
          { headers: corsHeaders, status: 500 }
        );
      }

      existingJobId = jobData.id;
      console.log(`Created job posting with ID: ${existingJobId}`);
    }

    // Extract keywords from the job description
    console.log("Extracting keywords from job description");
    const rawKeywords = await extractKeywords(jobContent);
    
    if (!rawKeywords) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to extract keywords" 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

    const keywordsArray = Array.isArray(rawKeywords) ? rawKeywords : [rawKeywords];
    
    console.log(`Extracted ${keywordsArray.length} keywords`);

    // Insert keywords into the database
    const keywordObjects = keywordsArray.map(keyword => ({
      keyword: keyword.trim(),
      job_posting_id: existingJobId,
      user_id: userId
    }));

    const { error: keywordError } = await supabase
      .from("extracted_keywords")
      .insert(keywordObjects);

    if (keywordError) {
      console.error("Error inserting keywords:", keywordError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to insert keywords: ${keywordError.message}` 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

    // Update job posting status to processed
    const { error: updateError } = await supabase
      .from("job_postings")
      .update({
        status: "processed",
        processed_at: new Date().toISOString()
      })
      .eq("id", existingJobId);

    if (updateError) {
      console.error("Error updating job posting status:", updateError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId: existingJobId,
          keywords: keywordsArray,
          warning: `Job processed but status update failed: ${updateError.message}` 
        }),
        { headers: corsHeaders, status: 200 }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        jobId: existingJobId,
        keywords: keywordsArray,
        message: "Job posting processed successfully"
      }),
      { headers: corsHeaders, status: 200 }
    );

  } catch (error) {
    console.error("Error processing job posting:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error.message}` 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
