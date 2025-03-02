
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";
import { extractKeywordsWithFallback } from "./gemini-service.ts";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create a job posting and extract keywords from it
 */
export async function createJobPosting(userId: string | undefined, jobDescription: string) {
  try {
    console.log("Creating job posting");
    
    // Insert job posting into database
    const { data: jobData, error: jobError } = await supabase
      .from("job_postings")
      .insert({
        description: jobDescription,
        user_id: userId,
        status: "processing"
      })
      .select()
      .single();
    
    if (jobError) {
      console.error("Error creating job posting:", jobError);
      throw jobError;
    }
    
    console.log("Created job posting with ID:", jobData.id);
    
    // Extract keywords in a separate process
    extractKeywordsFromJob(jobData.id, jobDescription).catch(error => {
      console.error("Error extracting keywords:", error);
    });
    
    return { jobId: jobData.id };
  } catch (error) {
    console.error("Error in createJobPosting:", error);
    throw error;
  }
}

/**
 * Extract keywords from a job description and save them to the database
 */
export async function extractKeywordsFromJob(jobId: number, jobDescription: string) {
  try {
    console.log("Extracting keywords from job description");
    
    // Extract keywords
    const keywords = await extractKeywordsWithFallback(jobDescription);
    
    console.log(`Extracted ${keywords.length} keywords for job ID ${jobId}`);
    
    // Delete any existing keywords for this job
    await supabase
      .from("extracted_keywords")
      .delete()
      .eq("job_posting_id", jobId);
    
    // Insert new keywords
    if (keywords.length > 0) {
      const keywordsWithJobId = keywords.map(k => ({
        job_posting_id: jobId,
        keyword: k.keyword,
        frequency: k.frequency
      }));
      
      const { error: insertError } = await supabase
        .from("extracted_keywords")
        .insert(keywordsWithJobId);
      
      if (insertError) {
        console.error("Error inserting keywords:", insertError);
        throw insertError;
      }
    }
    
    // Update job status
    const { error: updateError } = await supabase
      .from("job_postings")
      .update({ 
        status: "processed",
        processed_at: new Date().toISOString()
      })
      .eq("id", jobId);
    
    if (updateError) {
      console.error("Error updating job status:", updateError);
      throw updateError;
    }
    
    console.log(`Successfully processed job ${jobId}`);
    return keywords;
  } catch (error) {
    console.error("Error in extractKeywordsFromJob:", error);
    
    // Update job status to failed
    await supabase
      .from("job_postings")
      .update({ 
        status: "failed",
        processed_at: new Date().toISOString()
      })
      .eq("id", jobId);
    
    throw error;
  }
}

/**
 * Process a PDF file and extract job description and keywords
 */
export async function processPdfFile(userId: string | undefined, pdfText: string) {
  try {
    console.log("Processing PDF file");
    
    // Create job posting with the PDF text
    const { jobId } = await createJobPosting(userId, pdfText);
    
    return { 
      success: true, 
      jobId,
      textLength: pdfText.length
    };
  } catch (error) {
    console.error("Error processing PDF file:", error);
    throw error;
  }
}
