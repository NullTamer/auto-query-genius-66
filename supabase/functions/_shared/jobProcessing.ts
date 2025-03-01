
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractKeywords } from './keywordExtraction.ts';

/**
 * Process a job posting and extract keywords
 */
export const processJobPosting = async (
  supabaseClient: ReturnType<typeof createClient>,
  jobDescription: string
) => {
  try {
    // Store job posting in database
    const { data: jobData, error: jobError } = await supabaseClient
      .from('job_postings')
      .insert({
        description: jobDescription,
        status: 'processing'
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('Error storing job posting:', jobError);
      return { error: jobError };
    }

    // Extract keywords
    const keywords = await extractKeywords(jobDescription);

    // Store keywords in database
    if (keywords.length > 0) {
      const keywordInserts = keywords.map(k => ({
        job_posting_id: jobData.id,
        keyword: k.keyword,
        frequency: k.frequency
      }));

      const { error: keywordError } = await supabaseClient
        .from('extracted_keywords')
        .insert(keywordInserts);

      if (keywordError) {
        console.error('Error storing keywords:', keywordError);
        // Update job status to failed
        await supabaseClient
          .from('job_postings')
          .update({ status: 'failed', processed_at: new Date().toISOString() })
          .eq('id', jobData.id);
        return { error: keywordError };
      }
    }

    // Mark job as processed
    await supabaseClient
      .from('job_postings')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('id', jobData.id);

    return { jobId: jobData.id, keywords };
  } catch (error) {
    console.error('Error processing job posting:', error);
    return { error };
  }
};
