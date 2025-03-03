
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GeminiService } from './gemini-service.ts'
import { JobRepository } from './job-repository.ts'
import { sanitizeKeywords } from './utils.ts'

// Add proper CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
};

console.log('Scrape job posting edge function loaded')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request for CORS preflight');
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log('Request received:', req.method)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
      throw new Error('Missing required environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const jobRepository = new JobRepository(supabase)
    const geminiService = new GeminiService(geminiApiKey)

    // Get request payload
    const payload = await req.json()
    const { jobDescription, pdfUrl, is_public = true } = payload

    console.log(`Processing job with public access: ${is_public}`)
    
    if (!jobDescription && !pdfUrl) {
      throw new Error('Either jobDescription or pdfUrl must be provided')
    }

    let originalText = jobDescription
    let source = 'manual_entry'

    // If a PDF URL is provided, try to extract text from it
    if (pdfUrl) {
      console.log('PDF URL provided, fetching content:', pdfUrl)
      try {
        const pdfResponse = await fetch(pdfUrl)
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`)
        }
        // In a real application, you'd extract text from the PDF here
        // For now, just use a placeholder
        originalText = `Text extracted from PDF at ${pdfUrl}`
        source = 'pdf_upload'
      } catch (error) {
        console.error('Error fetching PDF:', error)
        throw new Error(`Failed to fetch PDF: ${error.message}`)
      }
    }

    // Create job posting
    console.log('Creating job posting in database')
    const jobPosting = await jobRepository.createJobPosting(originalText, source, is_public)
    
    if (!jobPosting || !jobPosting.id) {
      throw new Error('Failed to create job posting')
    }

    const jobId = jobPosting.id
    console.log(`Job posting created with ID: ${jobId}`)

    // Process keywords with Gemini
    let keywords = []
    try {
      console.log('Extracting keywords with Gemini')
      const extractedKeywords = await geminiService.extractKeywords(originalText)
      keywords = sanitizeKeywords(extractedKeywords)
      
      if (keywords.length === 0) {
        console.log('No keywords extracted, falling back to basic extraction')
        // Fallback to basic extraction if Gemini fails
        const basicKeywords = originalText
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3)
          .map(word => ({ keyword: word, frequency: 1 }))
          .slice(0, 20)
        
        keywords = basicKeywords
      }
      
      // Store keywords
      console.log(`Storing ${keywords.length} keywords`)
      await jobRepository.storeKeywords(jobId, keywords, is_public)
      
      // Update job status
      await jobRepository.updateJobStatus(jobId, 'completed')
      
      return new Response(
        JSON.stringify({
          success: true,
          jobId: jobId,
          keywords: keywords,
          message: 'Job posting processed successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      console.error('Error processing job:', error)
      
      // Update job status to error
      await jobRepository.updateJobStatus(jobId, 'error', error.message)
      
      throw error
    }
  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
