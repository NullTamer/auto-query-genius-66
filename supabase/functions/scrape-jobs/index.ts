
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.3.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobData {
  title: string;
  description: string;
  company: string;
  location: string;
  url: string;
  source_id: string;
  external_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { source_id } = await req.json();

    // Get source details
    const { data: source } = await supabaseClient
      .from('job_sources')
      .select('*')
      .eq('id', source_id)
      .single();

    if (!source) {
      throw new Error('Source not found');
    }

    // Simulate scraping (replace with actual scraping logic)
    const mockJobData: JobData = {
      title: "Senior Software Engineer",
      description: "We are looking for a senior software engineer with expertise in React, Node.js, and TypeScript...",
      company: "Tech Corp",
      location: "Remote",
      url: `${source.base_url}/job/123`,
      source_id: source.id,
      external_id: "job-123"
    };

    // Store job posting
    const { data: jobPosting, error: jobError } = await supabaseClient
      .from('job_postings')
      .insert({
        source_id: mockJobData.source_id,
        external_id: mockJobData.external_id,
        title: mockJobData.title,
        description: mockJobData.description,
        company: mockJobData.company,
        location: mockJobData.location,
        posting_url: mockJobData.url,
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Extract keywords using OpenAI
    const openai = new OpenAIApi(new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    }));

    const prompt = `Extract key skills, technologies, and job requirements from this job posting. Format as a JSON array of strings:
    ${mockJobData.title}
    ${mockJobData.description}`;

    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 200,
      temperature: 0.3,
    });

    const keywords = JSON.parse(completion.data.choices[0].text || '[]');

    // Store extracted keywords
    const { error: keywordError } = await supabaseClient
      .from('extracted_keywords')
      .insert(
        keywords.map((keyword: string) => ({
          job_posting_id: jobPosting.id,
          keyword: keyword.toLowerCase(),
          category: 'skill'
        }))
      );

    if (keywordError) throw keywordError;

    // Update job posting status
    await supabaseClient
      .from('job_postings')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('id', jobPosting.id);

    return new Response(
      JSON.stringify({ message: 'Job processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
