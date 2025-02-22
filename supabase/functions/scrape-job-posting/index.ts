
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCRAPING_TIMEOUT = 30000; // 30 seconds timeout

async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, jobPostingId } = await req.json();
    console.log('Processing job:', { url, jobPostingId });

    if (!url || !jobPostingId) {
      throw new Error('Missing required parameters: url and jobPostingId');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      // Attempt to fetch the job posting with timeout
      console.log('Fetching job posting from URL:', url);
      const response = await fetchWithTimeout(url, SCRAPING_TIMEOUT);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }
      
      const html = await response.text();
      console.log('Successfully fetched job posting HTML');

      // Update job posting status to processing
      await supabase
        .from('job_postings')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobPostingId);

      // Mock processing for now - replace with actual scraping logic
      const mockJobData = {
        title: "Software Engineer",
        company: "Tech Company",
        location: "Remote",
        description: html.substring(0, 1000), // Truncate for logging
        skills: ["JavaScript", "React", "Node.js"],
        requirements: ["3+ years experience", "Bachelor's degree"]
      };

      // Update job posting with processed data
      const { error: updateError } = await supabase
        .from('job_postings')
        .update({
          title: mockJobData.title,
          description: mockJobData.description,
          company: mockJobData.company,
          location: mockJobData.location,
          status: 'processed',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobPostingId);

      if (updateError) throw updateError;

      // Insert extracted keywords
      const keywordsToInsert = [
        ...mockJobData.skills.map(skill => ({
          job_posting_id: jobPostingId,
          keyword: skill,
          category: 'skill',
          frequency: 2,
          created_at: new Date().toISOString()
        })),
        ...mockJobData.requirements.map(req => ({
          job_posting_id: jobPostingId,
          keyword: req,
          category: 'requirement',
          frequency: 1,
          created_at: new Date().toISOString()
        }))
      ];

      const { error: keywordError } = await supabase
        .from('extracted_keywords')
        .insert(keywordsToInsert);

      if (keywordError) throw keywordError;

      console.log('Job processing completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Job posting processed successfully',
          data: { jobData: mockJobData, keywords: keywordsToInsert }
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );

    } catch (error) {
      console.error('Error processing job:', error);
      
      // Update job posting status to failed with error details
      await supabase
        .from('job_postings')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
          description: `Error: ${error.message}`
        })
        .eq('id', jobPostingId);

      throw error;
    }

  } catch (error) {
    console.error('Function error:', error);
    
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
});
