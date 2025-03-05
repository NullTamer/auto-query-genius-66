
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { JobRepository } from "./job-repository.ts"
import { GeminiService } from "./gemini-service.ts"
import { ScraperService } from "./scraper-service.ts"
import { delay, retryWithBackoff, corsHeaders } from "./utils.ts"

// Main serve function for the edge function
serve(async (req) => {
  console.log("Edge function 'scrape-job-posting' invoked")
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request")
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Parse request body
    const requestData = await req.json()
    const { 
      jobDescription, 
      jobPostingId, 
      jobUrl, 
      query, 
      provider = 'indeed',
      location = '' 
    } = requestData
    
    console.log(`Request data received: provider=${provider}, query=${query}, location=${location}, jobPostingId=${jobPostingId || 'none'}, jobUrl=${jobUrl || 'none'}, description length=${jobDescription ? jobDescription.length : 0}`)
    
    if (!jobDescription && !jobUrl && !query && !jobPostingId) {
      console.error("Invalid request: No job description, URL, query, or posting ID provided")
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Either job description, job URL, query, or job posting ID is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.error("Gemini API key not configured in environment variables")
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Create services
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials not configured in environment variables")
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log("Creating services with credentials")
    const jobRepository = new JobRepository(supabaseUrl, supabaseKey)
    const geminiService = new GeminiService(geminiApiKey)
    const scraperService = new ScraperService()
    
    let finalJobDescriptions: Array<{
      title: string, 
      company: string, 
      description: string, 
      url: string,
      source: string
    }> = []
    let finalJobId = jobPostingId
    let finalJobDescription = jobDescription
    
    // If a job URL was provided, attempt to scrape the content
    if (jobUrl) {
      console.log(`Attempting to scrape job content from URL: ${jobUrl}`)
      try {
        // This is where we would implement detailed job URL scraping
        // For now, we'll just use a placeholder
        finalJobDescription = `Job posting scraped from ${jobUrl}`
        finalJobDescriptions.push({
          title: "Job from URL",
          company: "Unknown Company",
          description: finalJobDescription,
          url: jobUrl,
          source: "Direct URL"
        })
        console.log("Job content scraped successfully (placeholder)")
      } catch (error) {
        console.error("Error scraping job content:", error)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to scrape job content' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // If a search query was provided, scrape job listings from the selected provider
    if (query) {
      console.log(`Searching for '${query}' jobs on ${provider}`)
      
      try {
        let jobResults: Array<{title: string, company: string, description: string, url: string}> = []
        
        // Scrape jobs based on the selected provider
        switch (provider.toLowerCase()) {
          case 'indeed':
            jobResults = await scraperService.scrapeIndeedJobs(query, location)
            break
          case 'linkedin':
            jobResults = await scraperService.scrapeLinkedInJobs(query, location)
            break
          case 'google':
            jobResults = await scraperService.scrapeGoogleJobs(query, location)
            break
          default:
            // Default to Indeed if provider is not specified or not recognized
            jobResults = await scraperService.scrapeIndeedJobs(query, location)
        }
        
        console.log(`Scraped ${jobResults.length} ${provider} job listings`)
        
        // Map the results to our standard format
        finalJobDescriptions = jobResults.map(job => ({
          ...job,
          source: provider.charAt(0).toUpperCase() + provider.slice(1) // Capitalize provider name
        }))
        
      } catch (error) {
        console.error(`Error scraping ${provider} jobs:`, error)
        return new Response(
          JSON.stringify({ success: false, error: `Failed to scrape ${provider} jobs` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // Store job descriptions and extract keywords
    const jobResults = []
    for (const job of finalJobDescriptions) {
      try {
        console.log(`Processing job: ${job.title}`)
        
        // Create a job posting in the database
        const jobPosting = await jobRepository.createJobPosting(
          job.title,
          job.description,
          job.url,
          job.source
        )
        
        // Extract keywords from the job description
        console.log(`Extracting keywords for job: ${jobPosting.id}`)
        const keywords = await retryWithBackoff(async () => {
          return await geminiService.extractKeywords(job.description)
        })
        
        console.log(`Extracted ${keywords.length} keywords for job: ${jobPosting.id}`)
        
        // Store keywords in the database
        await jobRepository.insertKeywords(jobPosting.id, keywords)
        
        // Update job status to processed
        await jobRepository.updateJobStatus(
          jobPosting.id,
          'processed',
          new Date().toISOString()
        )
        
        // Add to results
        jobResults.push({
          jobId: jobPosting.id,
          title: job.title,
          company: job.company,
          url: job.url,
          source: job.source,
          keywords: keywords
        })
        
      } catch (error) {
        console.error(`Error processing job '${job.title}':`, error)
        // Continue with other jobs even if one fails
      }
    }
    
    // Process a single job description if provided directly
    if (finalJobDescription && !query && !jobUrl) {
      try {
        // Extract keywords from job description
        console.log("Extracting keywords from directly provided job description")
        const keywords = await retryWithBackoff(async () => {
          return await geminiService.extractKeywords(finalJobDescription)
        })
        
        console.log(`Extracted ${keywords.length} keywords`)
        
        if (finalJobId) {
          // Insert extracted keywords into the database
          console.log(`Inserting ${keywords.length} keywords for job ID: ${finalJobId}`)
          await jobRepository.insertKeywords(finalJobId, keywords)
          
          // Update job status to processed
          console.log(`Updating job status to 'processed' for ID: ${finalJobId}`)
          await jobRepository.updateJobStatus(
            finalJobId,
            'processed',
            new Date().toISOString()
          )
          
          // Add to results
          jobResults.push({
            jobId: finalJobId,
            title: "Direct Input",
            company: "N/A",
            url: "N/A",
            source: "Direct Input",
            keywords: keywords
          })
        }
      } catch (error) {
        console.error("Error processing direct job description:", error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to process job description: ${error.message}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }
    
    console.log(`Job processing completed successfully with ${jobResults.length} results`)
    return new Response(
      JSON.stringify({
        success: true,
        jobs: jobResults,
        message: 'Job postings processed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('Error processing job posting:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
