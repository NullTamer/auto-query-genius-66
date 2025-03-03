import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { JobRepository } from "./job-repository.ts";
import { extractKeywords, parseJobDescription } from "./utils.ts";
import { analyzeJobPostingWithGemini } from "./gemini-service.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to sleep/delay for throttling
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to extract text from PDF URL
async function extractTextFromPdf(pdfUrl: string, retries = 3): Promise<string> {
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      console.log(`Fetching PDF from URL: ${pdfUrl}, attempt ${attempt + 1}`);
      const response = await fetch(pdfUrl);
      
      if (!response.ok) {
        const status = response.status;
        console.error(`HTTP error fetching PDF: ${status}, URL: ${pdfUrl}`);
        
        if (status === 404) {
          throw new Error("PDF file not found");
        }
        
        if (status === 429) {
          // Rate limited, wait longer before retry
          await sleep(2000 * (attempt + 1));
          attempt++;
          continue;
        }
        
        throw new Error(`Failed to fetch PDF: ${status}`);
      }
      
      // Get PDF content as ArrayBuffer
      const pdfBuffer = await response.arrayBuffer();
      
      // Use PDF.js or another library to extract text
      // For this example, we'll use a simple placeholder
      console.log(`PDF fetched successfully, size: ${pdfBuffer.byteLength} bytes`);
      
      // In a real implementation, you would extract text from the PDF here
      // For now, we'll just return a placeholder message to simulate extraction
      return `Extracted text from PDF (${pdfBuffer.byteLength} bytes)`;
    } catch (error) {
      console.error(`Error extracting text from PDF (attempt ${attempt + 1}):`, error);
      attempt++;
      
      if (attempt >= retries) {
        throw new Error(`Failed to extract text from PDF after ${retries} attempts: ${error.message}`);
      }
      
      // Wait before retrying
      await sleep(1000 * attempt);
    }
  }
  
  throw new Error("Failed to extract text from PDF");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting job processing...');
    
    // Parse request body
    const body = await req.json();
    console.log('Request body:', body);
    
    const { jobDescription, pdfUrl, is_public = true } = body;
    
    // Check if either jobDescription or pdfUrl is provided
    if (!jobDescription && !pdfUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'No job description or PDF URL provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Initialize repository with admin privileges
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase URL or service role key');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const jobRepository = new JobRepository(supabase);
    
    // Process text content from either direct input or PDF
    let textContent = jobDescription;
    
    if (pdfUrl && !textContent) {
      console.log('Processing from PDF URL:', pdfUrl);
      // Extract text from PDF
      try {
        textContent = await extractTextFromPdf(pdfUrl);
      } catch (error) {
        console.error('Failed to extract text from PDF:', error);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to process PDF: ${error.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }
    
    // Process the job posting content
    console.log(`Job description length: ${textContent.length}`);
    
    // Create job posting record
    const jobId = await jobRepository.createJobPosting({
      content: textContent,
      description: textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''),
      status: 'pending',
      is_public: is_public,
      pdf_path: pdfUrl || null
    });
    
    console.log('Created job posting with ID:', jobId);
    
    // Process with rate limiting to avoid overwhelming the Gemini API
    try {
      console.log('Processing with Gemini API...');
      await sleep(500); // Add a small delay
      
      // Call Gemini API to analyze the job posting
      const { parsedKeywords, error: geminiError } = await analyzeJobPostingWithGemini(textContent);
      
      if (geminiError) {
        console.error('Error from Gemini API:', geminiError);
        throw new Error(`Gemini API error: ${geminiError}`);
      }
      
      // If Gemini returned keywords, use them
      let keywords = [];
      if (parsedKeywords && parsedKeywords.length > 0) {
        console.log('Using keywords from Gemini:', parsedKeywords);
        keywords = parsedKeywords;
      } else {
        // Fallback to basic keyword extraction
        console.log('Falling back to basic keyword extraction');
        keywords = extractKeywords(textContent);
      }
      
      console.log(`Extracted ${keywords.length} keywords`);
      
      // Save keywords to database
      if (keywords.length > 0) {
        await jobRepository.saveKeywords(jobId, keywords, is_public);
        console.log('Keywords saved to database');
      }
      
      // Update job status to processed
      await jobRepository.updateJobStatus(jobId, 'processed');
      console.log('Job status updated to processed');
      
      // Return response with job ID and keywords
      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          keywords: keywords.map(k => ({ 
            keyword: k.keyword, 
            frequency: k.frequency || 1 
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error processing job:', error);
      
      // Update job status to failed
      await jobRepository.updateJobStatus(jobId, 'failed');
      
      return new Response(
        JSON.stringify({ success: false, error: `Processing failed: ${error.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: `Server error: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
