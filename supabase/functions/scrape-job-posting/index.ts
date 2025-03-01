
// Follow this setup guide to integrate the Deno SDK: https://deno.land/manual/getting_started/installation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getKeywords, processText } from "./gemini-service.ts"
import { createJobPosting, updateJobPosting } from "./job-repository.ts"
import { corsHeaders } from "../_shared/cors.ts"

// Create a Supabase client with the Auth context of the logged-in user.
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("Starting job processing function...")
    
    // Check if this is a PDF upload (multipart form data)
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      return await handlePDFUpload(req)
    } else {
      return await handleTextProcessing(req)
    }
  } catch (error) {
    console.error("Error in main function handler:", error)
    return new Response(
      JSON.stringify({ success: false, error: `Server error: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function handlePDFUpload(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log(`Processing PDF upload: ${file.name} (${file.size} bytes)`)
    
    // Check file size - 5MB is a good limit for reliable processing
    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'PDF file is too large (max 5MB). Please use a smaller file or paste text directly.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Use the serviceRoleClient to access Storage with admin privileges
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    
    // Save PDF to storage 
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    // Upload to storage
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('job_pdfs')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })
    
    if (storageError) {
      console.error("Storage upload error:", storageError)
      return new Response(
        JSON.stringify({ success: false, error: `Failed to upload PDF: ${storageError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log(`PDF uploaded to storage: ${fileName}`)
    
    try {
      // Create a simpler fallback approach: Create a blob to get a URL
      const pdfBytes = await file.arrayBuffer()
      const pdfText = await extractTextFromPDF(file)
      
      if (!pdfText || pdfText.length < 50) {
        throw new Error("Could not extract sufficient text from PDF")
      }
      
      // Process the text to extract keywords
      console.log(`Extracted ${pdfText.length} characters of text from PDF`)
      const keywords = await getKeywords(pdfText)
      
      // Create job posting in database
      const userId = formData.get('userId')?.toString()
      const jobId = await createJobPosting(pdfText, userId)
      
      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          textLength: pdfText.length,
          keywords,
          message: "PDF processed successfully"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } catch (processingError) {
      console.error("Error processing PDF content:", processingError)
      
      // Create a job posting entry with status 'failed'
      const userId = formData.get('userId')?.toString()
      const jobId = await createJobPosting(
        `Failed to process PDF: ${file.name}. Error: ${processingError.message}`, 
        userId,
        'failed'
      )
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to process PDF: ${processingError.message}`,
          jobId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in PDF upload handler:", error)
    return new Response(
      JSON.stringify({ success: false, error: `Failed to process PDF: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function handleTextProcessing(req: Request) {
  try {
    const { jobDescription, userId } = await req.json()
    
    if (!jobDescription) {
      return new Response(
        JSON.stringify({ success: false, error: "Job description is required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log("Processing job description text...")
    
    // Create the job posting first, so we have an ID to return
    const jobId = await createJobPosting(jobDescription, userId)
    
    try {
      // Process the text to extract keywords
      const keywords = await getKeywords(jobDescription)
      
      // Update the job posting status to 'processed'
      await updateJobPosting(jobId, 'processed')
      
      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          keywords,
          message: "Job description processed successfully"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } catch (processingError) {
      console.error("Error processing job text:", processingError)
      
      // Update the job posting status to 'failed'
      await updateJobPosting(jobId, 'failed')
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to process job description: ${processingError.message}`,
          jobId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in text processing handler:", error)
    return new Response(
      JSON.stringify({ success: false, error: `Server error: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Using a much simpler approach that relies on browser APIs
    // Convert the file to a base64 string in smaller chunks to avoid stack overflow
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Process the PDF data using Gemini directly instead of trying to extract text first
    console.log("Processing PDF with Gemini's document understanding capabilities")
    
    // Use Gemini to extract text from the PDF by directly asking it to summarize
    const result = await processText(bytes, file.type);
    
    if (!result || result.length < 50) {
      throw new Error("Failed to extract text from PDF");
    }
    
    return result;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}
