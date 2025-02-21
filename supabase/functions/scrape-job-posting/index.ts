
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PHIDATA_API_KEY = Deno.env.get('PHIDATA_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url, jobPostingId } = await req.json()

    if (!url || !jobPostingId) {
      throw new Error('Missing required parameters: url and jobPostingId')
    }

    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Scrape the job posting
    const scrapeResponse = await fetch('https://api.phidata.com/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PHIDATA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    })

    if (!scrapeResponse.ok) {
      throw new Error(`Scraping failed: ${scrapeResponse.statusText}`)
    }

    const scrapedData = await scrapeResponse.json()

    // 2. Extract relevant information
    const {
      title,
      description,
      company,
      location,
      skills = [],
      requirements = []
    } = scrapedData

    // 3. Update job posting with scraped data
    await supabase
      .from('job_postings')
      .update({
        title,
        description,
        company,
        location,
        status: 'processed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobPostingId)

    // 4. Process and store keywords
    const keywords = [...new Set([...skills, ...requirements])]
      .map(keyword => ({
        job_posting_id: jobPostingId,
        keyword: keyword.toLowerCase(),
        frequency: 1,
        created_at: new Date().toISOString()
      }))

    if (keywords.length > 0) {
      await supabase
        .from('extracted_keywords')
        .insert(keywords)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Job posting processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
