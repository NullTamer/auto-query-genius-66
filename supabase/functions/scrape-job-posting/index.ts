
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { corsHeaders, retryWithBackoff } from './utils.ts';
import { GeminiService } from './gemini-service.ts';
import { JobRepository } from './job-repository.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestData;
  try {
    requestData = await req.json();
    const { jobDescription, jobPostingId } = requestData;
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const geminiService = new GeminiService(apiKey);
    const jobRepository = new JobRepository(supabaseUrl, supabaseKey);

    console.log('Processing job:', jobPostingId);

    const keywords = await retryWithBackoff(async () => {
      return await geminiService.extractKeywords(jobDescription);
    });

    console.log('Extracted keywords:', keywords);

    await jobRepository.enableRealtimeForJob('job_postings');
    await jobRepository.enableRealtimeForJob('extracted_keywords'); // Enable realtime for keywords too
    
    const processedAt = new Date().toISOString();
    await jobRepository.updateJobStatus(jobPostingId, 'processed', processedAt);
    await jobRepository.insertKeywords(jobPostingId, keywords);

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
    );

  } catch (error) {
    console.error('Error in edge function:', error);
    
    try {
      if (requestData?.jobPostingId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const jobRepository = new JobRepository(supabaseUrl, supabaseKey);
        await jobRepository.updateJobStatus(requestData.jobPostingId, 'failed');
      }
    } catch (updateError) {
      console.error('Error updating job status to failed:', updateError);
    }

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
