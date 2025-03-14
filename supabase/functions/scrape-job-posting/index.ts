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

// Function to extract keywords using Perplexity API
async function extractKeywordsWithPerplexity(text: string, apiKey: string): Promise<Array<{keyword: string, frequency: number}>> {
  console.log("Extracting keywords with Perplexity API")
  
  const prompt = `
  You are an expert technical recruiter with deep knowledge of technical skills, technologies, and job requirements.
  
  Analyze the job description below and extract the following:
  1. Technical skills (programming languages, frameworks, tools)
  2. Required qualifications
  3. Key responsibilities
  4. Domain knowledge requirements
  
  Return ONLY a JSON array of objects with the format:
  [{"keyword": "Extracted Term", "frequency": number from 1-5 representing importance/relevance}]
  
  - Assign higher frequency (4-5) to critical requirements
  - Assign medium frequency (3) to important but not critical skills
  - Assign lower frequency (1-2) to nice-to-have skills
  - Do not include generic terms like "team player" or "communication skills"
  - Focus on technical and domain-specific terms
  - Ensure terms are specific (e.g., "React" instead of just "JavaScript framework")
  - Limit to maximum 20 most relevant terms
  
  Job Description:
  ${text}
  `
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are a technical skills extraction assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1000,
      frequency_penalty: 1,
      presence_penalty: 0
    }),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Perplexity API error: ${response.status} ${errorText}`)
    throw new Response(errorText, { status: response.status })
  }
  
  const data = await response.json()
  console.log("Perplexity API response:", JSON.stringify(data).substring(0, 500) + "...")
  
  try {
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error("Invalid response format from Perplexity API")
    }
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\[.*\]/s)
    if (!jsonMatch) {
      throw new Error("Could not find JSON array in response")
    }
    
    const cleanJson = jsonMatch[0].trim()
    const keywords = JSON.parse(cleanJson)
    
    console.log(`Extracted ${keywords.length} keywords with Perplexity:`, keywords.slice(0, 5))
    return keywords
  } catch (e) {
    console.error("Failed to parse Perplexity response:", e)
    console.log("Raw response:", JSON.stringify(data))
    throw new Error("Failed to parse response from Perplexity")
  }
}

// Function to extract keywords from text using Gemini API
async function extractKeywordsWithGemini(text: string, apiKey: string): Promise<Array<{keyword: string, frequency: number}>> {
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
  
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
  console.log("Gemini response:", JSON.stringify(data).substring(0, 500) + "...")
  
  try {
    const textResponse = data.candidates[0].content.parts[0].text
    // Clean up any markdown code formatting that might be in the response
    const cleanJson = textResponse.replace(/```json|```/g, '').trim()
    const keywords = JSON.parse(cleanJson)
    console.log(`Extracted ${keywords.length} keywords:`, keywords.slice(0, 5))
    return keywords
  } catch (e) {
    console.error("Failed to parse Gemini response:", e)
    console.log("Raw response:", JSON.stringify(data))
    throw new Error("Failed to parse response from Gemini")
  }
}

// Main serve function for the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Parse request body
    const requestData = await req.json()
    const { jobDescription, jobPostingId } = requestData
    
    if (!jobDescription) {
      return new Response(
        JSON.stringify({ error: 'Job description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log("Processing job posting:", jobPostingId ? `ID: ${jobPostingId}` : "New job")
    console.log("Job description length:", jobDescription.length)
    
    // Try to use Perplexity API first, fall back to Gemini if not available
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!perplexityApiKey && !geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'No API keys configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Extract keywords using the appropriate API
    let keywords
    try {
      if (perplexityApiKey) {
        console.log("Using Perplexity API for keyword extraction")
        keywords = await retryWithBackoff(async () => {
          return await extractKeywordsWithPerplexity(jobDescription, perplexityApiKey)
        })
      } else {
        console.log("Using Gemini API for keyword extraction")
        keywords = await retryWithBackoff(async () => {
          return await extractKeywordsWithGemini(jobDescription, geminiApiKey!)
        })
      }
    } catch (error) {
      console.error("Error extracting keywords:", error)
      
      // If Perplexity failed, try Gemini as fallback
      if (perplexityApiKey && geminiApiKey) {
        console.log("Perplexity API failed, trying Gemini API as fallback")
        keywords = await retryWithBackoff(async () => {
          return await extractKeywordsWithGemini(jobDescription, geminiApiKey)
        })
      } else {
        throw error
      }
    }
    
    console.log(`Extracted ${keywords.length} keywords:`, keywords)
    
    // Create database client for Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey)
    
    let finalJobId = jobPostingId
    
    // If no job posting ID was provided, create a new job posting
    if (!finalJobId) {
      // Get or create a default job source
      const { data: sources, error: sourcesError } = await supabase
        .from('job_sources')
        .select('*')
        .limit(1)
      
      if (sourcesError) {
        throw new Error(`Error fetching job sources: ${sourcesError.message}`)
      }
      
      let sourceId
      if (sources?.length) {
        sourceId = sources[0].id
      } else {
        const { data: newSource, error: createError } = await supabase
          .from('job_sources')
          .insert({
            source_name: 'default',
            is_public: true
          })
          .select()
          .single()
        
        if (createError) {
          throw new Error(`Error creating job source: ${createError.message}`)
        }
        
        sourceId = newSource.id
      }
      
      // Create a new job posting
      const { data: jobPosting, error: jobError } = await supabase
        .from('job_postings')
        .insert({
          source_id: sourceId,
          title: 'Extracted from Description',
          description: jobDescription,
          posting_url: 'direct-input',
          status: 'pending',
          is_public: true
        })
        .select()
        .single()
      
      if (jobError) {
        throw new Error(`Error creating job posting: ${jobError.message}`)
      }
      
      finalJobId = jobPosting.id
    }
    
    // Insert extracted keywords into the database
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
      throw new Error(`Error inserting keywords: ${insertError.message}`)
    }
    
    // Update job status to processed
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('id', finalJobId)
    
    if (updateError) {
      throw new Error(`Error updating job status: ${updateError.message}`)
    }
    
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
            const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}&limit=${limit}`, {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
              }
            })
            
            if (!response.ok) {
              throw { error: { message: `Error fetching from ${table}: ${response.statusText}` } }
            }
            
            const data = await response.json()
            return { data, error: null }
          },
          async single() {
            const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}&limit=${limit}`, {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
              }
            })
            
            if (!response.ok) {
              throw { error: { message: `Error fetching from ${table}: ${response.statusText}` } }
            }
            
            const data = await response.json()
            return { data: data.length ? data[0] : null, error: null }
          }
        }),
        eq: (column: string, value: any) => ({
          async execute() {
            const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}&${column}=eq.${value}`, {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
              }
            })
            
            if (!response.ok) {
              throw { error: { message: `Error fetching from ${table}: ${response.statusText}` } }
            }
            
            const data = await response.json()
            return { data, error: null }
          },
          async single() {
            const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}&${column}=eq.${value}&limit=1`, {
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
              }
            })
            
            if (!response.ok) {
              throw { error: { message: `Error fetching from ${table}: ${response.statusText}` } }
            }
            
            const data = await response.json()
            return { data: data.length ? data[0] : null, error: null }
          }
        })
      }),
      insert: (values: any | any[]) => ({
        async execute() {
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
            throw { error: { message: `Error inserting into ${table}: ${response.statusText}` } }
          }
          
          const data = await response.json()
          return { data, error: null }
        },
        select: () => ({
          async single() {
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
              throw { error: { message: `Error inserting into ${table}: ${response.statusText}` } }
            }
            
            const data = await response.json()
            return { data: data.length ? data[0] : null, error: null }
          }
        })
      }),
      update: (values: any) => ({
        eq: (column: string, value: any) => ({
          async execute() {
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
              throw { error: { message: `Error updating ${table}: ${response.statusText}` } }
            }
            
            return { error: null }
          }
        })
      })
    })
  }
}
