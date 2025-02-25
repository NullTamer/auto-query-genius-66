
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (i > 0) {
        const backoffDelay = baseDelay * Math.pow(2, i - 1);
        console.log(`Retry ${i + 1} with delay ${backoffDelay}ms`);
        await delay(backoffDelay);
      }
      return await fn();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error;
      
      if (i < maxRetries - 1 && (error.status === 429 || error.status === 404)) {
        continue;
      }
      throw error;
    }
  }
  
  throw lastError;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, jobPostingId } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing job:', jobPostingId);

    // Process with Gemini API
    const processWithGemini = async () => {
      await delay(2000); // 2s throttle between requests
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Extract the most important technical keywords from this job description. Return only a list of keywords, lowercase, no explanations:\n\n${jobDescription}`
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              topK: 32,
              topP: 1,
              maxOutputTokens: 1024,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
              }
            ]
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Gemini API error:', error);
        throw new Error(`Failed to process with Gemini: ${JSON.stringify(error)}`);
      }

      return await response.json();
    };

    const aiResponse = await retryWithBackoff(processWithGemini);
    
    if (!aiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    const keywords = aiResponse.candidates[0].content.parts[0].text
      .toLowerCase()
      .split(/[\n,]/)
      .map(k => k.trim())
      .filter(k => k.length > 2);

    console.log('Extracted keywords:', keywords);

    // Update job posting status
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobPostingId);

    if (updateError) {
      console.error('Error updating job posting:', updateError);
      throw updateError;
    }

    // Insert extracted keywords with explicit created_at
    if (keywords.length > 0) {
      const now = new Date().toISOString();
      const keywordsToInsert = keywords.map(keyword => ({
        job_posting_id: jobPostingId,
        keyword,
        frequency: 1,
        created_at: now // Explicitly set created_at
      }));

      const { error: keywordError } = await supabase
        .from('extracted_keywords')
        .insert(keywordsToInsert);

      if (keywordError) {
        console.error('Error inserting keywords:', keywordError);
        throw keywordError;
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
    );

  } catch (error) {
    console.error('Error in edge function:', error);
    
    // Ensure the job posting is marked as failed
    try {
      const { jobPostingId } = await req.json();
      if (jobPostingId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('job_postings')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobPostingId);
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
