
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
    const { url, jobPostingId } = await req.json()

    if (!url || !jobPostingId) {
      throw new Error('Missing required parameters: url and jobPostingId')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting job scraping for URL:', url);

    // Simulate scraping for now - in a real implementation, you'd use a proper scraping library
    const scrapedData = {
      title: 'Software Engineer',
      description: 'We are looking for a Software Engineer with experience in React, TypeScript, and Node.js. The ideal candidate will have 3+ years of experience building web applications.',
      company: 'Tech Corp',
      location: 'Remote',
      skills: ['React', 'TypeScript', 'Node.js', 'Web Development', 'JavaScript'],
      requirements: ['3+ years experience', 'Bachelor\'s degree', 'Strong communication skills']
    };

    console.log('Scraped data:', scrapedData);

    // Update job posting with scraped data
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({
        title: scrapedData.title,
        description: scrapedData.description,
        company: scrapedData.company,
        location: scrapedData.location,
        status: 'processed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobPostingId);

    if (updateError) throw updateError;

    // Process and store keywords
    const keywords = [...new Set([...scrapedData.skills, ...scrapedData.requirements])]
      .map(keyword => ({
        job_posting_id: jobPostingId,
        keyword: keyword.toLowerCase(),
        category: keyword.length > 20 ? 'requirement' : 'skill', // Simple categorization logic
        frequency: 1,
        created_at: new Date().toISOString()
      }));

    if (keywords.length > 0) {
      const { error: keywordError } = await supabase
        .from('extracted_keywords')
        .insert(keywords);

      if (keywordError) throw keywordError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Job posting processed successfully',
        data: { keywords, jobPosting: scrapedData }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
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
    );
  }
})
