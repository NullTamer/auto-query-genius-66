
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { extractKeywordsWithGemini } from "./gemini-service.ts";

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface JobData {
  description: string;
  userId?: string | null;
}

/**
 * Extracts keywords from a job description and saves them in the database
 */
export async function extractKeywordsFromJob(jobData: JobData) {
  try {
    console.log("Extracting keywords from job description");
    
    // Step 1: Create a new job posting record
    const { data: jobPosting, error: jobError } = await supabase
      .from("job_postings")
      .insert({
        description: jobData.description,
        user_id: jobData.userId || null,
        status: "processing"
      })
      .select("id")
      .single();

    if (jobError) {
      console.error("Error creating job posting:", jobError);
      throw new Error("Failed to create job posting record");
    }

    const jobId = jobPosting.id;
    console.log(`Created job posting with ID: ${jobId}`);

    try {
      // Step 2: Extract keywords using Gemini
      const keywords = await extractKeywordsWithGemini(jobData.description);
      
      if (!keywords || keywords.length === 0) {
        throw new Error("No keywords were extracted");
      }
      
      console.log(`Extracted ${keywords.length} keywords from job description`);

      // Step 3: Insert the keywords
      const keywordRows = keywords.map((kw: any) => ({
        job_posting_id: jobId,
        keyword: kw.keyword,
        frequency: kw.frequency || 1
      }));

      // Insert in batches to avoid hitting limitations
      const BATCH_SIZE = 50;
      for (let i = 0; i < keywordRows.length; i += BATCH_SIZE) {
        const batch = keywordRows.slice(i, i + BATCH_SIZE);
        const { error: keywordError } = await supabase
          .from("extracted_keywords")
          .insert(batch);

        if (keywordError) {
          console.error("Error inserting keywords:", keywordError);
          throw keywordError;
        }
      }

      // Step 4: Update the job posting status to 'processed'
      const { error: updateError } = await supabase
        .from("job_postings")
        .update({
          status: "processed",
          processed_at: new Date().toISOString()
        })
        .eq("id", jobId);

      if (updateError) {
        console.error("Error updating job posting status:", updateError);
        throw updateError;
      }

      // Return success response with the job ID and keywords
      return {
        success: true,
        jobId,
        keywords: keywords.map((kw: any) => ({
          keyword: kw.keyword,
          frequency: kw.frequency || 1
        }))
      };
    } catch (processingError) {
      console.error("Error processing job:", processingError);
      
      // Update the job posting status to 'failed'
      await supabase
        .from("job_postings")
        .update({
          status: "failed",
          description: processingError.message || "Unknown error"
        })
        .eq("id", jobId);
      
      throw processingError;
    }
  } catch (error) {
    console.error("Error in extractKeywordsFromJob:", error);
    throw error;
  }
}
