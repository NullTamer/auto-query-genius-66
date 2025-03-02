
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { JobRepository } from "./job-repository.ts"
import { extractKeywordsWithGemini } from "./gemini-service.ts"
import { processJobPosting } from "./utils.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const requestData = await req.json()
    console.log("Received request data:", JSON.stringify(requestData))

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    const jobRepository = new JobRepository(supabase)

    // Extract data from request
    const { jobDescription, userId, jobId: providedJobId, pdfUrl } = requestData

    let jobId = providedJobId
    let description = jobDescription

    // If we have a pdfUrl, we need to fetch and process the PDF content
    if (pdfUrl && !description) {
      console.log("Processing PDF from URL:", pdfUrl)
      try {
        // Fetch the PDF content
        const pdfResponse = await fetch(pdfUrl)
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`)
        }
        
        // Extract text content from the PDF response
        // This is a simple extraction - in production you might want a more robust solution
        const pdfBuffer = await pdfResponse.arrayBuffer()
        const pdfText = new TextDecoder().decode(pdfBuffer)
        
        // Convert binary PDF content to a basic text representation
        // This is very simplified - real PDF text extraction would require a proper PDF parser
        description = `PDF Content: ${pdfText.substring(0, 1000)}... [truncated]`
        
        console.log(`Extracted text from PDF (first 100 chars): ${description.substring(0, 100)}...`)
      } catch (error) {
        console.error("Error processing PDF:", error)
        throw new Error(`Failed to process PDF: ${error.message}`)
      }
    }

    if (!description && !jobId) {
      throw new Error("Either jobDescription or jobId must be provided")
    }

    // Create job posting if no jobId is provided
    if (!jobId && description) {
      console.log("Creating new job posting")
      jobId = await jobRepository.createJobPosting(description, userId)
      console.log(`Created job posting with ID: ${jobId}`)
    }

    if (!jobId) {
      throw new Error("Failed to create or retrieve job posting")
    }

    // Process and extract keywords
    console.log(`Processing job posting with ID: ${jobId}`)
    const jobData = await jobRepository.getJobPosting(jobId)
    
    if (!jobData) {
      throw new Error(`Job posting with ID ${jobId} not found`)
    }
    
    // Use provided description or the one from the database
    const textToProcess = description || jobData.description
    
    console.log("Extracting keywords with Gemini...")
    const keywords = await extractKeywordsWithGemini(textToProcess)
    
    if (!keywords || keywords.length === 0) {
      console.log("No keywords extracted, falling back to basic processing")
      await processJobPosting(jobId, textToProcess, jobRepository)
    } else {
      console.log(`Extracted ${keywords.length} keywords with Gemini`)
      await jobRepository.saveKeywords(jobId, keywords)
    }
    
    // Mark job as processed
    await jobRepository.updateJobStatus(jobId, 'processed')
    
    console.log(`Job ${jobId} processing completed successfully`)
    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        keywords 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Error processing job posting:", error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
