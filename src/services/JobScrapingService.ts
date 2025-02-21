
import { supabase } from "@/integrations/supabase/client";
import type { JobSource, JobPosting, ExtractedKeyword } from "@/custom/supabase-types";

export class JobScrapingService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;

  static async processJobPosting(jobDescription: string, sourceId: string): Promise<string> {
    try {
      // Create initial job posting record
      const { data: jobPosting, error: insertError } = await supabase
        .from('job_postings')
        .insert({
          source_id: sourceId,
          title: 'Processing...',
          description: jobDescription, // Store the job description
          posting_url: 'direct-input',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError || !jobPosting) {
        throw new Error(`Failed to create job posting: ${insertError?.message}`);
      }

      // Trigger the Edge Function with job description
      const { data: scrapeData, error: scrapeError } = await supabase.functions
        .invoke('scrape-job-posting', {
          body: { 
            jobDescription,
            jobPostingId: jobPosting.id 
          }
        });

      if (scrapeError) {
        await this.updateJobPostingStatus(jobPosting.id, 'failed');
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
    postingId: string,
    status: JobPosting['status'],
    details?: Partial<JobPosting>
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

      if (error) throw error;
    } catch (error) {
      console.error('Error updating job posting status:', error);
      throw error;
    }
  }
}
