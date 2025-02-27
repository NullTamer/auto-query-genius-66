
import { supabase } from "@/integrations/supabase/client";

export class JobScrapingService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly TIMEOUT = 30000; // 30 seconds timeout

  static async processJobPosting(jobDescription: string): Promise<number> {
    try {
      const session = await supabase.auth.getSession();
      
      // Create a source if needed
      const { data: sources, error: sourcesError } = await supabase
        .from('job_sources')
        .select('*')
        .limit(1);

      if (sourcesError) {
        console.error('Error fetching sources:', sourcesError);
        throw new Error(`Failed to fetch sources: ${sourcesError.message}`);
      }

      let sourceId: number;
      if (sources && sources.length > 0) {
        sourceId = sources[0].id;
      } else {
        // Create a default source
        const { data: newSource, error: createError } = await supabase
          .from('job_sources')
          .insert({
            source_name: 'direct-input',
            is_public: true,
            user_id: session.data.session?.user?.id
          })
          .select()
          .single();

        if (createError || !newSource) {
          console.error('Error creating source:', createError);
          throw new Error(`Failed to create source: ${createError?.message}`);
        }
        sourceId = newSource.id;
      }

      // Create initial job posting record
      const { data: jobPosting, error: insertError } = await supabase
        .from('job_postings')
        .insert({
          source_id: sourceId,
          description: jobDescription,
          title: 'Job Posting Analysis',
          posting_url: 'direct-input',
          status: 'pending',
          is_public: true,
          user_id: session.data.session?.user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError || !jobPosting) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to create job posting: ${insertError?.message}`);
      }

      console.log('Invoking edge function for job:', jobPosting.id);
      
      // Process using the edge function
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          jobDescription,
          jobPostingId: jobPosting.id 
        }
      });

      if (scrapeError) {
        console.error('Edge function error:', scrapeError);
        await this.updateJobPostingStatus(jobPosting.id, 'failed', {
          description: `Processing failed: ${scrapeError.message}`
        });
        throw new Error(`Processing failed: ${scrapeError.message}`);
      }

      console.log('Job posting processed successfully:', scrapeData);
      return jobPosting.id;

    } catch (error) {
      console.error('Error processing job posting:', error);
      throw error;
    }
  }

  static async updateJobPostingStatus(
    postingId: number,
    status: 'pending' | 'processed' | 'failed',
    details?: Partial<{
      description?: string | null;
      title?: string | null;
      processed_at?: string | null;
    }>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('job_postings')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...details
        })
        .eq('id', postingId);

      if (error) {
        console.error('Error updating status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating job posting status:', error);
      throw error;
    }
  }

  static async retryJobPosting(jobPostingId: number): Promise<void> {
    try {
      const { data: jobPosting, error: fetchError } = await supabase
        .from('job_postings')
        .select('*')
        .eq('id', jobPostingId)
        .single();

      if (fetchError || !jobPosting) {
        throw new Error('Failed to fetch job posting for retry');
      }

      await this.updateJobPostingStatus(jobPostingId, 'pending');

      const { error: scrapeError } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          jobDescription: jobPosting.description,
          jobPostingId: jobPosting.id 
        }
      });

      if (scrapeError) {
        console.error('Error retrying job:', scrapeError);
        throw scrapeError;
      }

      console.log('Job retry initiated successfully');
    } catch (error) {
      console.error('Error retrying job posting:', error);
      throw error;
    }
  }
}
