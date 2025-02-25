
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class JobRepository {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async enableRealtimeForJob(tableName: string) {
    await this.supabase.rpc('enable_realtime_for_job', { table_name: tableName });
  }

  async updateJobStatus(jobId: string, status: 'processed' | 'failed', processedAt?: string) {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (processedAt) {
      updateData.processed_at = processedAt;
    }

    const { error } = await this.supabase
      .from('job_postings')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job posting:', error);
      throw error;
    }
  }

  async insertKeywords(jobId: string, keywords: string[]) {
    if (keywords.length === 0) return;

    const now = new Date().toISOString();
    const keywordsToInsert = keywords.map(keyword => ({
      job_posting_id: jobId,
      keyword,
      frequency: 1,
      created_at: now
    }));

    const { error } = await this.supabase
      .from('extracted_keywords')
      .insert(keywordsToInsert);

    if (error) {
      console.error('Error inserting keywords:', error);
      throw error;
    }
  }
}
