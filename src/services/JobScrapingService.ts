
import { supabase } from "@/integrations/supabase/client";
import type { JobSource, JobPosting, ExtractedKeyword } from "@/custom/supabase-types";

export class JobScrapingService {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  static async processJobPosting(url: string, sourceId: string): Promise<void> {
    try {
      // Create initial job posting record
      const { data: jobPosting, error: insertError } = await supabase
        .from('job_postings')
        .insert({
          source_id: sourceId,
          title: 'Processing...',
          posting_url: url,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError || !jobPosting) {
        throw new Error(`Failed to create job posting: ${insertError?.message}`);
      }

      // Trigger the scraping Edge Function
      const { data: scrapeData, error: scrapeError } = await supabase.functions
        .invoke('scrape-job-posting', {
          body: { url, jobPostingId: jobPosting.id }
        });

      if (scrapeError) {
        throw new Error(`Scraping failed: ${scrapeError.message}`);
      }

      console.log('Job posting processed successfully:', scrapeData);

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

  static async saveExtractedKeywords(
    jobPostingId: string,
    keywords: Array<{ keyword: string; category?: string; frequency: number }>
  ): Promise<void> {
    try {
      const keywordsToInsert = keywords.map(k => ({
        job_posting_id: jobPostingId,
        keyword: k.keyword,
        category: k.category || null,
        frequency: k.frequency,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('extracted_keywords')
        .insert(keywordsToInsert);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving extracted keywords:', error);
      throw error;
    }
  }
}
