
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utility function for sleeping/delaying execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add throttling - wait at least 2 seconds between API calls
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retry attempt ${attempt + 1}, waiting ${delay}ms...`)
        await sleep(delay)
      } else {
        await sleep(2000) // Default throttle
      }
      
      return await operation()
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error)
      lastError = error as Error
      
      // Check for specific HTTP errors
      if (error instanceof Response) {
        const status = error.status
        
        // Don't retry on client errors, except for rate limits
        if (status !== 429 && status >= 400 && status < 500) {
          throw error
        }
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed')
}

// Function to extract keywords from text using Gemini API
async function extractKeywordsWithGemini(text: string, apiKey: string): Promise<Array<{keyword: string, frequency: number}>> {
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
  
  console.log("Calling Gemini API to extract keywords from job description")
  
  const prompt = `
  You are an expert recruiter and hiring manager with deep expertise in technical roles.
  
  Please extract the most important skills, technologies, and requirements from the job description below.
  
  Return ONLY a JSON array of objects with the format:
  [{"keyword": "Skill or Technology Name", "frequency": number representing importance from 1-5}]
  
  Do not include any markdown, explanation, or other text, just the JSON array.
  Sort them by frequency (importance) in descending order.
  
  JOB DESCRIPTION:
  ${text}
  `
  
  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gemini API error: ${response.status} ${errorText}`)
      throw new Response(errorText, { status: response.status })
    }
    
    const data = await response.json()
    console.log("Gemini response received successfully")
    
    try {
      const textResponse = data.candidates[0].content.parts[0].text
      // Clean up any markdown code formatting that might be in the response
      const cleanJson = textResponse.replace(/```json|```/g, '').trim()
      const keywords = JSON.parse(cleanJson)
      console.log(`Extracted ${keywords.length} keywords from job description`)
      return keywords
    } catch (e) {
      console.error("Failed to parse Gemini response:", e)
      throw new Error("Failed to parse response from Gemini")
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error)
    throw error
  }
}

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
    const { jobDescription, jobPostingId, jobUrl } = requestData
    
    console.log(`Request data received: jobPostingId=${jobPostingId}, jobUrl=${jobUrl || 'none'}, description length=${jobDescription ? jobDescription.length : 0}`)
    
    if (!jobDescription && !jobUrl && !jobPostingId) {
      console.error("Invalid request: Neither job description, URL, nor posting ID provided")
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Either job description, job URL, or job posting ID is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Get API key from environment
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error("Gemini API key not configured in environment variables")
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Create database client for Supabase with proper credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials not configured in environment variables")
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log("Creating Supabase client with service role key")
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey)
    
    let finalJobId = jobPostingId
    let finalJobDescription = jobDescription
    
    // If a job URL was provided but no description, attempt to scrape the content
    if (jobUrl && !jobDescription) {
      console.log(`Attempting to scrape job content from URL: ${jobUrl}`)
      try {
        // This is where you would implement job scraping logic
        // For now, we'll just use a placeholder
        finalJobDescription = `Job posting scraped from ${jobUrl}`
        console.log("Job content scraped successfully (placeholder)")
      } catch (error) {
        console.error("Error scraping job content:", error)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to scrape job content' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // If no job posting ID was provided, create a new job posting
    if (!finalJobId && finalJobDescription) {
      console.log("No job ID provided, creating a new job posting record")
      
      // Get or create a default job source
      console.log("Fetching default job source")
      const { data: sources, error: sourcesError } = await supabase
        .from('job_sources')
        .select('*')
        .limit(1)
      
      if (sourcesError) {
        console.error("Error fetching job sources:", sourcesError)
        throw new Error(`Error fetching job sources: ${sourcesError.message}`)
      }
      
      let sourceId
      if (sources?.length) {
        sourceId = sources[0].id
        console.log(`Using existing job source with ID: ${sourceId}`)
      } else {
        console.log("No existing job source found, creating a new one")
        const { data: newSource, error: createError } = await supabase
          .from('job_sources')
          .insert({
            source_name: 'default',
            is_public: true
          })
          .select()
          .single()
        
        if (createError) {
          console.error("Error creating job source:", createError)
          throw new Error(`Error creating job source: ${createError.message}`)
        }
        
        sourceId = newSource.id
        console.log(`Created new job source with ID: ${sourceId}`)
      }
      
      // Create a new job posting
      console.log("Creating new job posting record")
      const { data: jobPosting, error: jobError } = await supabase
        .from('job_postings')
        .insert({
          source_id: sourceId,
          title: jobUrl ? `Job from ${new URL(jobUrl).hostname}` : 'Extracted from Description',
          description: finalJobDescription,
          posting_url: jobUrl || 'direct-input',
          status: 'pending',
          is_public: true
        })
        .select()
        .single()
      
      if (jobError) {
        console.error("Error creating job posting:", jobError)
        throw new Error(`Error creating job posting: ${jobError.message}`)
      }
      
      finalJobId = jobPosting.id
      console.log(`Created new job posting with ID: ${finalJobId}`)
    }
    
    // Extract keywords from job description
    let keywords: Array<{keyword: string, frequency: number}> = []
    
    if (finalJobDescription) {
      console.log("Extracting keywords from job description")
      keywords = await retryWithBackoff(async () => {
        return await extractKeywordsWithGemini(finalJobDescription, apiKey)
      })
      
      console.log(`Extracted ${keywords.length} keywords`)
      
      if (finalJobId) {
        // Insert extracted keywords into the database
        console.log(`Inserting ${keywords.length} keywords for job ID: ${finalJobId}`)
        const keywordInserts = keywords.map(k => ({
          job_posting_id: finalJobId,
          keyword: k.keyword,
          frequency: k.frequency,
          is_public: true
        }))
        
        const { error: insertError } = await supabase
          .from('extracted_keywords')
          .insert(keywordInserts)
        
        if (insertError) {
          console.error("Error inserting keywords:", insertError)
          throw new Error(`Error inserting keywords: ${insertError.message}`)
        }
        
        // Update job status to processed
        console.log(`Updating job status to 'processed' for ID: ${finalJobId}`)
        const { error: updateError } = await supabase
          .from('job_postings')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString()
          })
          .eq('id', finalJobId)
        
        if (updateError) {
          console.error("Error updating job status:", updateError)
          throw new Error(`Error updating job status: ${updateError.message}`)
        }
      }
    }
    
    console.log("Job processing completed successfully")
    return new Response(
      JSON.stringify({
        success: true,
        jobId: finalJobId,
        keywords: keywords,
        message: 'Job posting processed successfully'
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

// Helper function to create a Supabase client
function createSupabaseClient(supabaseUrl: string, serviceRoleKey: string) {
  return {
    from: (table: string) => ({
      select: (columns = '*') => ({
        limit: (limit: number) => ({
          async execute() {
            console.log(`Executing SELECT query on table '${table}' with limit ${limit}`)
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}&limit=${limit}`, {
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey,
                  'Content-Type': 'application/json'
                }
              })
              
              if (!response.ok) {
                const errorText = await response.text()
                console.error(`Error fetching from ${table}: ${response.status} ${errorText}`)
                throw { error: { message: `Error fetching from ${table}: ${response.statusText} (${response.status})` } }
              }
              
              const data = await response.json()
              return { data, error: null }
            } catch (error) {
              console.error(`Exception in SELECT query on '${table}':`, error)
              throw error
            }
          },
          async single() {
            console.log(`Executing SELECT query on table '${table}' with single result`)
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}&limit=${limit}`, {
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey,
                  'Content-Type': 'application/json'
                }
              })
              
              if (!response.ok) {
                const errorText = await response.text()
                console.error(`Error fetching from ${table}: ${response.status} ${errorText}`)
                throw { error: { message: `Error fetching from ${table}: ${response.statusText} (${response.status})` } }
              }
              
              const data = await response.json()
              return { data: data.length ? data[0] : null, error: null }
            } catch (error) {
              console.error(`Exception in SELECT query on '${table}' with single result:`, error)
              throw error
            }
          }
        }),
        eq: (column: string, value: any) => ({
          async execute() {
            console.log(`Executing SELECT query on table '${table}' WHERE ${column}=${value}`)
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}&${column}=eq.${value}`, {
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey,
                  'Content-Type': 'application/json'
                }
              })
              
              if (!response.ok) {
                const errorText = await response.text()
                console.error(`Error fetching from ${table}: ${response.status} ${errorText}`)
                throw { error: { message: `Error fetching from ${table}: ${response.statusText} (${response.status})` } }
              }
              
              const data = await response.json()
              return { data, error: null }
            } catch (error) {
              console.error(`Exception in SELECT query on '${table}' WHERE ${column}=${value}:`, error)
              throw error
            }
          },
          async single() {
            console.log(`Executing SELECT query on table '${table}' WHERE ${column}=${value} with single result`)
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}&${column}=eq.${value}&limit=1`, {
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey,
                  'Content-Type': 'application/json'
                }
              })
              
              if (!response.ok) {
                const errorText = await response.text()
                console.error(`Error fetching from ${table}: ${response.status} ${errorText}`)
                throw { error: { message: `Error fetching from ${table}: ${response.statusText} (${response.status})` } }
              }
              
              const data = await response.json()
              return { data: data.length ? data[0] : null, error: null }
            } catch (error) {
              console.error(`Exception in SELECT query on '${table}' WHERE ${column}=${value} with single result:`, error)
              throw error
            }
          }
        })
      }),
      insert: (values: any | any[]) => ({
        async execute() {
          console.log(`Executing INSERT into table '${table}'`)
          try {
            const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(values)
            })
            
            if (!response.ok) {
              const errorText = await response.text()
              console.error(`Error inserting into ${table}: ${response.status} ${errorText}`)
              throw { error: { message: `Error inserting into ${table}: ${response.statusText} (${response.status})` } }
            }
            
            const data = await response.json()
            return { data, error: null }
          } catch (error) {
            console.error(`Exception in INSERT into '${table}':`, error)
            throw error
          }
        },
        select: () => ({
          async single() {
            console.log(`Executing INSERT into table '${table}' with single result return`)
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify(values)
              })
              
              if (!response.ok) {
                const errorText = await response.text()
                console.error(`Error inserting into ${table}: ${response.status} ${errorText}`)
                throw { error: { message: `Error inserting into ${table}: ${response.statusText} (${response.status})` } }
              }
              
              const data = await response.json()
              return { data: data.length ? data[0] : null, error: null }
            } catch (error) {
              console.error(`Exception in INSERT into '${table}' with single result return:`, error)
              throw error
            }
          }
        })
      }),
      update: (values: any) => ({
        eq: (column: string, value: any) => ({
          async execute() {
            console.log(`Executing UPDATE on table '${table}' WHERE ${column}=${value}`)
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify(values)
              })
              
              if (!response.ok) {
                const errorText = await response.text()
                console.error(`Error updating ${table}: ${response.status} ${errorText}`)
                throw { error: { message: `Error updating ${table}: ${response.statusText} (${response.status})` } }
              }
              
              return { error: null }
            } catch (error) {
              console.error(`Exception in UPDATE on '${table}' WHERE ${column}=${value}:`, error)
              throw error
            }
          }
        })
      })
    })
  }
}
