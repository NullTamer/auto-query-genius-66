
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Initialize Supabase client with admin privileges
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Processing job:', jobPostingId, 'Description:', jobDescription)

    // Extract keywords (this is a simple example - you can enhance this)
    const keywords = jobDescription
      .toLowerCase()
      .match(/\b\w+\b/g)
      ?.filter(word => word.length > 3) || []

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
        created_at: new Date().toISOString()
      }))

      const { error: keywordError } = await supabase
        .from('keywords')
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
    console.error('Error:', error)
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
