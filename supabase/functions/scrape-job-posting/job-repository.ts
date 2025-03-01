
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { extractKeywordsWithGemini, extractKeywordsWithFallback } from "./gemini-service.ts";
import { v4 as uuidv4 } from "https://deno.land/std@0.110.0/uuid/mod.ts";

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Required environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Extract text from a PDF
async function extractTextFromPDF(pdfBuffer: Uint8Array): Promise<string> {
  try {
    console.log("Extracting text from PDF buffer of size:", pdfBuffer.length);
    
    // Here we would normally use a PDF parsing library like pdf-parse
    // Since we're in Deno with limited library support, we'll implement a basic extraction
    
    // Convert some of the PDF buffer to a string to check for text content
    // This is a very simple approach - in a real implementation, use a proper PDF parser
    const decoder = new TextDecoder("utf-8");
    
    // Try to find text content in the PDF
    // This is a simplified approach - real implementation would use proper PDF parsing
    let textContent = "";
    let foundText = false;
    
    // Look for text chunks in the PDF
    // Check for text markers in PDF
    for (let i = 0; i < pdfBuffer.length - 10; i++) {
      // Look for text objects in PDF (/T)
      if (pdfBuffer[i] === 47 && pdfBuffer[i+1] === 84) { // '/' and 'T'
        const chunk = decoder.decode(pdfBuffer.slice(i, i + 200));
        if (chunk.includes("/Text")) {
          textContent += chunk.replace(/[^\x20-\x7E]/g, " ").trim() + " ";
          foundText = true;
        }
      }
    }
    
    if (!foundText) {
      // If we couldn't find text objects, try a more generic approach
      // This will likely get gibberish but might catch some text
      for (let i = 0; i < pdfBuffer.length; i += 1000) {
        const end = Math.min(i + 1000, pdfBuffer.length);
        const chunk = decoder.decode(pdfBuffer.slice(i, end));
        const textOnly = chunk.replace(/[^\x20-\x7E]/g, " ").trim();
        textContent += textOnly + " ";
      }
    }
    
    // Clean up the extracted text
    textContent = textContent
      .replace(/\s+/g, " ")
      .trim();
    
    if (textContent.length < 20) {
      // If we couldn't extract meaningful text, provide a fallback
      return `Unable to extract sufficient text content from the PDF. Please try uploading a text-based PDF or manually entering the job description.`;
    }
    
    return textContent;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

// Function to process job data and extract keywords
export async function extractKeywordsFromJob(jobId: number): Promise<void> {
  try {
    // Get the job description from the database
    const { data: jobData, error: jobError } = await supabase
      .from("job_postings")
      .select("description")
      .eq("id", jobId)
      .single();

    if (jobError) {
      throw new Error(`Error fetching job data: ${jobError.message}`);
    }

    if (!jobData || !jobData.description) {
      throw new Error("No job description found for the given job ID");
    }

    // Extract keywords from the job description
    let keywords;
    try {
      console.log("Attempting to extract keywords with Gemini");
      keywords = await extractKeywordsWithGemini(jobData.description);
    } catch (geminiError) {
      console.error("Error extracting keywords with Gemini:", geminiError);
      console.log("Falling back to basic keyword extraction");
      keywords = extractKeywordsWithFallback(jobData.description);
    }

    // Update processed flag and store keywords
    const { error: updateError } = await supabase
      .from("job_postings")
      .update({
        processed_at: new Date().toISOString(),
        processed: true,
        failed: false,
        error_details: null
      })
      .eq("id", jobId);

    if (updateError) {
      throw new Error(`Error updating job status: ${updateError.message}`);
    }

    // Insert extracted keywords into the keywords table
    if (keywords && keywords.length > 0) {
      console.log(`Storing ${keywords.length} keywords for job ID ${jobId}`);
      
      const keywordsToInsert = keywords.map(kw => ({
        job_id: jobId,
        keyword: kw.keyword,
        frequency: kw.frequency || 1
      }));

      const { error: keywordError } = await supabase
        .from("keywords")
        .upsert(keywordsToInsert, {
          onConflict: 'job_id,keyword'
        });

      if (keywordError) {
        throw new Error(`Error storing keywords: ${keywordError.message}`);
      }
    } else {
      console.log("No keywords extracted from job description");
    }
  } catch (error) {
    console.error(`Error extracting keywords for job ID ${jobId}:`, error);
    
    // Update the job posting to mark it as failed
    await supabase
      .from("job_postings")
      .update({
        processed: true,
        failed: true,
        processed_at: new Date().toISOString(),
        error_details: error.message
      })
      .eq("id", jobId);
    
    throw error;
  }
}

// Function to create a new job posting
export async function createJobPosting(userId: string | null, description: string): Promise<{ jobId: number }> {
  try {
    const { data, error } = await supabase
      .from("job_postings")
      .insert({
        user_id: userId,
        description,
        processed: false,
        failed: false
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error creating job posting: ${error.message}`);
    }

    if (!data || !data.id) {
      throw new Error("Failed to create job posting: No ID returned");
    }

    return { jobId: data.id };
  } catch (error) {
    console.error("Error in createJobPosting:", error);
    throw error;
  }
}

// Function to process a PDF file
export async function processPdfFile(userId: string | null, pdfData: Uint8Array, fileName: string): Promise<any> {
  try {
    console.log(`Processing PDF file: ${fileName} (${pdfData.length} bytes)`);
    
    // Extract text from the PDF
    const extractedText = await extractTextFromPDF(pdfData);
    console.log(`Extracted ${extractedText.length} characters of text from PDF`);
    
    // Create a job posting with the extracted text
    const { jobId } = await createJobPosting(userId, extractedText);
    console.log(`Created job posting with ID: ${jobId}`);
    
    // Extract keywords from the job description
    let keywords = [];
    try {
      // Try to extract keywords with Gemini
      keywords = await extractKeywordsWithGemini(extractedText);
    } catch (geminiError) {
      console.error("Error extracting keywords with Gemini:", geminiError);
      // Fallback to basic keyword extraction
      keywords = extractKeywordsWithFallback(extractedText);
    }
    
    // Update the job posting record to mark it as processed
    const { error: updateError } = await supabase
      .from("job_postings")
      .update({
        processed_at: new Date().toISOString(),
        processed: true,
        failed: false,
        error_details: null
      })
      .eq("id", jobId);
    
    if (updateError) {
      throw new Error(`Error updating job status: ${updateError.message}`);
    }
    
    // Insert extracted keywords into the keywords table
    if (keywords && keywords.length > 0) {
      console.log(`Storing ${keywords.length} keywords for job ID ${jobId}`);
      
      const keywordsToInsert = keywords.map(kw => ({
        job_id: jobId,
        keyword: kw.keyword,
        frequency: kw.frequency || 1
      }));
      
      const { error: keywordError } = await supabase
        .from("keywords")
        .upsert(keywordsToInsert, {
          onConflict: 'job_id,keyword'
        });
      
      if (keywordError) {
        throw new Error(`Error storing keywords: ${keywordError.message}`);
      }
    }
    
    // Return the result
    return {
      success: true,
      jobId,
      fileName,
      extractedText,
      keywords,
      textLength: extractedText.length
    };
  } catch (error) {
    console.error("Error processing PDF:", error);
    
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
}
