
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

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
    const { jobDescription, jobPostingId } = await req.json()
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Initialize Supabase client with admin privileges
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Processing job:', jobPostingId)

    // Use OpenAI to analyze the job description
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract the most important technical keywords from this job description. Return only a list of keywords, lowercase, no explanations.'
          },
          {
            role: 'user',
            content: jobDescription
          }
        ]
      })
    })

    const aiResponse = await response.json()
    
    if (!response.ok) {
      console.error('OpenAI API error:', aiResponse)
      throw new Error('Failed to process with OpenAI: ' + JSON.stringify(aiResponse))
    }

    const keywords = aiResponse.choices[0].message.content
      .toLowerCase()
      .split(/[\n,]/)
      .map(k => k.trim())
      .filter(k => k.length > 2)

    console.log('Extracted keywords:', keywords)

    // Update job posting status
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobPostingId)

    if (updateError) {
      console.error('Error updating job posting:', updateError)
      throw updateError
    }

    // Insert extracted keywords
    if (keywords.length > 0) {
      const keywordsToInsert = keywords.map(keyword => ({
        job_posting_id: jobPostingId,
        keyword,
        frequency: 1, // Default frequency
        created_at: new Date().toISOString()
      }))

      const { error: keywordError } = await supabase
        .from('extracted_keywords') // Changed from 'keywords' to 'extracted_keywords'
        .insert(keywordsToInsert)

      if (keywordError) {
        console.error('Error inserting keywords:', keywordError)
        throw keywordError
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Job posting processed successfully',
        jobId: jobPostingId,
        keywordCount: keywords.length
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error in edge function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
