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

// Helper function to create a Supabase client
function createClient(supabaseUrl: string, serviceRoleKey: string) {
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

// Main serve function for the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received job processing request');
    const body = await req.json();
    
    // We can now receive either a jobDescription directly or a jobId reference
    const { jobDescription, jobId, userId } = body;
    
    // Initialize variables to track our processing
    let jobPostingId = jobId;
    let description = jobDescription;
    
    // Create a Supabase client with the service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // If we received a jobId but no description, fetch the description from the database
    if (jobPostingId && !description) {
      console.log(`Fetching job description for ID: ${jobPostingId}`);
      const { data: jobData, error: jobError } = await supabaseAdmin
        .from('job_postings')
        .select('description, content')
        .eq('id', jobPostingId)
        .single();
        
      if (jobError) {
        console.error('Error fetching job posting:', jobError);
        return new Response(
          JSON.stringify({ success: false, error: 'Job posting not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      // Use content if available, fall back to description
      description = jobData.content || jobData.description;
      
      if (!description) {
        console.error('Job posting has no content or description');
        return new Response(
          JSON.stringify({ success: false, error: 'Job posting has no content' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }
    
    // If we have no description at this point, it's an error
    if (!description) {
      console.error('No job description provided');
      return new Response(
        JSON.stringify({ success: false, error: 'No job description provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // If we don't have a job posting ID yet, create one
    if (!jobPostingId) {
      console.log('Creating new job posting record');
      const { data: newJob, error: createError } = await supabaseAdmin
        .from('job_postings')
        .insert([
          {
            description,
            content: description,
            status: 'pending',
            user_id: userId,
            is_public: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select('id')
        .single();
        
      if (createError) {
        console.error('Error creating job posting:', createError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create job posting' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      jobPostingId = newJob.id;
      console.log(`Created job posting with ID: ${jobPostingId}`);
    }
    
    // Extract keywords from the job description
    console.log('Extracting keywords from job description');
    let keywords;
    try {
      keywords = await retryWithBackoff(async () => {
        return await extractKeywordsWithGemini(description, Deno.env.get('GEMINI_API_KEY')!)
      });
      
      console.log(`Extracted ${keywords.length} keywords`);
      
      // Store the extracted keywords
      if (keywords && keywords.length > 0) {
        const keywordRows = keywords.map(kw => ({
          job_posting_id: jobPostingId,
          keyword: kw.keyword,
          frequency: kw.frequency || 1,
          is_public: true,
          user_id: userId
        }));
        
        console.log(`Storing ${keywordRows.length} keywords`);
        const { error: keywordError } = await supabaseAdmin
          .from('extracted_keywords')
          .insert(keywordRows);
          
        if (keywordError) {
          console.error('Error storing keywords:', keywordError);
          // Continue processing even if keyword storage fails
        }
      }
      
      // Update the job posting status to 'processed'
      console.log(`Updating job posting ${jobPostingId} status to 'processed'`);
      const { error: updateError } = await supabaseAdmin
        .from('job_postings')
        .update({ 
          status: 'processed',
          processed_at: new Date().toISOString()
        })
        .eq('id', jobPostingId);
        
      if (updateError) {
        console.error('Error updating job status:', updateError);
        // Continue processing even if status update fails
      }
      
      // Return success response with job ID and keywords
      return new Response(
        JSON.stringify({
          success: true,
          jobId: jobPostingId,
          keywords,
          message: 'Job processed successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (error) {
      console.error('Error processing job:', error);
      
      // Update the job posting status to 'failed'
      try {
        await supabaseAdmin
          .from('job_postings')
          .update({ status: 'failed' })
          .eq('id', jobPostingId);
      } catch (updateError) {
        console.error('Error updating job status to failed:', updateError);
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process job description' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
