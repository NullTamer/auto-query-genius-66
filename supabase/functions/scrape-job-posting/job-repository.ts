
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

export class JobRepository {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    });
    
    // Log initialization
    console.log("JobRepository initialized with Supabase client");
  }

  async enableRealtimeForJob(tableName: string) {
    try {
      console.log(`Enabling realtime for table: ${tableName}`);
      await this.supabase.rpc('enable_realtime_for_job', { table_name: tableName });
      console.log(`Realtime enabled for table: ${tableName}`);
    } catch (error) {
      console.error(`Error enabling realtime for ${tableName}:`, error);
      throw error;
    }
  }

  async updateJobStatus(jobId: string, status: 'processed' | 'failed', processedAt?: string) {
    console.log(`Updating job ${jobId} status to ${status}`);
    
    try {
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
      
      console.log(`Job ${jobId} status updated successfully to ${status}`);
    } catch (error) {
      console.error(`Exception in updateJobStatus for job ${jobId}:`, error);
      throw error;
    }
  }

  async getJobDetails(jobId: string) {
    console.log(`Fetching details for job: ${jobId}`);
    
    try {
      const { data, error } = await this.supabase
        .from('job_postings')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching job posting:', error);
        throw error;
      }
      
      if (!data) {
        console.warn(`No job found with ID: ${jobId}`);
      } else {
        console.log(`Successfully retrieved job details for ID: ${jobId}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Exception in getJobDetails for job ${jobId}:`, error);
      throw error;
    }
  }

  async insertKeywords(jobId: string, keywords: Array<{keyword: string, frequency: number}>) {
    if (keywords.length === 0) {
      console.log(`No keywords to insert for job ${jobId}`);
      return;
    }

    console.log(`Inserting ${keywords.length} keywords for job ${jobId}`);
    
    try {
      const now = new Date().toISOString();
      const keywordsToInsert = keywords.map(({ keyword, frequency }) => ({
        job_posting_id: jobId,
        keyword,
        frequency,
        created_at: now,
        is_public: true
      }));

      const { error } = await this.supabase
        .from('extracted_keywords')
        .insert(keywordsToInsert);

      if (error) {
        console.error('Error inserting keywords:', error);
        throw error;
      }
      
      console.log(`Successfully inserted ${keywords.length} keywords for job ${jobId}`);
    } catch (error) {
      console.error(`Exception in insertKeywords for job ${jobId}:`, error);
      throw error;
    }
  }
}
