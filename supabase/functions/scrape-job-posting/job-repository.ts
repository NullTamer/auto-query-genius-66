
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractKeywordsUsingGemini } from "./gemini-service.ts";

// Create a Supabase client with the project URL and secret key
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function createJobPosting(userId: string | undefined, jobDescription: string) {
  console.log(`Creating job posting for user ${userId || 'anonymous'}`);
  
  try {
    // Insert the job posting into the database
    const { data, error } = await supabase
      .from('job_postings')
      .insert({
        user_id: userId,
        description: jobDescription,
        status: 'pending' // Use the enum value directly
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating job posting:', error);
      throw new Error(`Error creating job posting: ${error.message}`);
    }

    if (!data || !data.id) {
      throw new Error('Failed to create job posting: No ID returned');
    }

    const jobId = data.id;
    console.log(`Created job posting with ID: ${jobId}`);
    
    return { jobId };
  } catch (error) {
    console.error('Error in createJobPosting:', error);
    throw error;
  }
}

export async function extractKeywordsFromJob(jobId: number) {
  console.log(`Extracting keywords for job ID: ${jobId}`);
  
  try {
    // Get the job posting
    const { data: jobPosting, error: jobError } = await supabase
      .from('job_postings')
      .select('description')
      .eq('id', jobId)
      .single();

    if (jobError) {
      console.error('Error fetching job posting:', jobError);
      await updateJobStatus(jobId, 'failed');
      throw new Error(`Failed to fetch job posting: ${jobError.message}`);
    }

    if (!jobPosting || !jobPosting.description) {
      console.error('No job description found for job ID:', jobId);
      await updateJobStatus(jobId, 'failed');
      throw new Error('No job description found');
    }

    // Extract keywords using Gemini
    const keywords = await extractKeywordsUsingGemini(jobPosting.description);
    
    if (!keywords || keywords.length === 0) {
      console.error('No keywords extracted for job ID:', jobId);
      await updateJobStatus(jobId, 'failed');
      throw new Error('Failed to extract keywords');
    }

    console.log(`Extracted ${keywords.length} keywords for job ID ${jobId}`);
    
    // Insert keywords into the database
    const { error: keywordError } = await supabase
      .from('extracted_keywords')
      .insert(
        keywords.map(k => ({
          job_posting_id: jobId,
          keyword: k.keyword,
          frequency: k.frequency
        }))
      );

    if (keywordError) {
      console.error('Error storing keywords:', keywordError);
      await updateJobStatus(jobId, 'failed');
      throw new Error(`Failed to store keywords: ${keywordError.message}`);
    }

    // Update job status to processed
    await updateJobStatus(jobId, 'processed');
    
    return { success: true, keywords };
  } catch (error) {
    console.error(`Error extracting keywords for job ID ${jobId}:`, error);
    await updateJobStatus(jobId, 'failed');
    throw error;
  }
}

export async function updateJobStatus(jobId: number, status: 'pending' | 'processed' | 'failed') {
  console.log(`Updating job ${jobId} status to ${status}`);
  
  try {
    const { error } = await supabase
      .from('job_postings')
      .update({ 
        status: status,
        processed_at: status === 'processed' ? new Date().toISOString() : null
      })
      .eq('id', jobId);

    if (error) {
      console.error(`Error updating job status to ${status}:`, error);
      throw new Error(`Failed to update job status: ${error.message}`);
    }
  } catch (error) {
    console.error(`Error in updateJobStatus for job ${jobId}:`, error);
    throw error;
  }
}

export async function processPdfFile(userId: string | undefined, pdfBuffer: Uint8Array, fileName: string) {
  console.log(`Processing PDF file: ${fileName} (${pdfBuffer.length} bytes)`);
  
  try {
    // First, extract text from the PDF buffer
    const extractedText = await extractTextFromPdf(pdfBuffer);
    console.log(`Extracted ${extractedText.length} characters of text from PDF`);
    
    if (!extractedText || extractedText.trim() === '') {
      throw new Error('Failed to extract text from PDF');
    }
    
    // Create job posting with the extracted text
    const { jobId } = await createJobPosting(userId, extractedText);
    
    // Extract keywords from the job posting
    try {
      const { keywords } = await extractKeywordsFromJob(jobId);
      
      return {
        success: true,
        jobId,
        extractedText,
        keywords
      };
    } catch (keywordError) {
      console.error('Error extracting keywords from PDF job:', keywordError);
      // We still return the job ID and extracted text, even if keyword extraction failed
      return {
        success: true,
        jobId,
        extractedText,
        error: keywordError.message
      };
    }
  } catch (error) {
    console.error('Error processing PDF file:', error);
    throw error;
  }
}

async function extractTextFromPdf(pdfBuffer: Uint8Array): Promise<string> {
  // Basic text extraction for small PDFs
  // This is a simple approach - for production, consider using a more robust PDF library
  try {
    // Convert binary data to text (this is a simple approach and won't work for all PDFs)
    const textDecoder = new TextDecoder('utf-8');
    let content = textDecoder.decode(pdfBuffer);
    
    // Simple cleanup to find and extract text content
    content = content
      .replace(/^\s*\n/gm, '\n') // Remove empty lines
      .replace(/[^\x20-\x7E\n]/g, ' ') // Replace non-printable ASCII with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    // Basic extraction of anything that looks like text
    const textBlocks = content.match(/[A-Za-z0-9\s.,;:'"()\-]{10,}/g) || [];
    return textBlocks.join(' ');
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return 'Failed to extract text from PDF document. Please provide text manually.';
  }
}
