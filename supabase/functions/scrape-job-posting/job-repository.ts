
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface JobPosting {
  content: string;
  description: string;
  status: 'pending' | 'processed' | 'failed';
  is_public?: boolean;
  pdf_path?: string | null;
}

interface Keyword {
  keyword: string;
  frequency?: number;
}

export class JobRepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async createJobPosting(jobPosting: JobPosting): Promise<number> {
    console.log('Creating job posting:', jobPosting);
    const { data, error } = await this.supabase
      .from('job_postings')
      .insert({
        content: jobPosting.content,
        description: jobPosting.description,
        status: jobPosting.status,
        is_public: jobPosting.is_public ?? true, // Default to public
        pdf_path: jobPosting.pdf_path
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating job posting:', error);
      throw new Error(`Failed to create job posting: ${error.message}`);
    }

    return data.id;
  }

  async updateJobStatus(jobId: number, status: 'pending' | 'processed' | 'failed'): Promise<void> {
    console.log(`Updating job ${jobId} status to ${status}`);
    const { error } = await this.supabase
      .from('job_postings')
      .update({
        status: status,
        processed_at: status === 'processed' ? new Date().toISOString() : null
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job status:', error);
      throw new Error(`Failed to update job status: ${error.message}`);
    }
  }

  async saveKeywords(jobId: number, keywords: Keyword[], isPublic: boolean = true): Promise<void> {
    // Check if we have any keywords to save
    if (!keywords || keywords.length === 0) {
      console.log('No keywords to save');
      return;
    }

    console.log(`Saving ${keywords.length} keywords for job ${jobId}`);
    
    // Format the keywords for insertion
    const keywordsToInsert = keywords.map(keyword => ({
      job_posting_id: jobId,
      keyword: keyword.keyword,
      frequency: keyword.frequency || 1,
      is_public: isPublic // Set public flag based on parameter
    }));

    // Insert keywords in batches to avoid hitting size limits
    const batchSize = 100;
    for (let i = 0; i < keywordsToInsert.length; i += batchSize) {
      const batch = keywordsToInsert.slice(i, i + batchSize);
      console.log(`Inserting batch ${i / batchSize + 1} with ${batch.length} keywords`);
      
      const { error } = await this.supabase
        .from('extracted_keywords')
        .insert(batch);

      if (error) {
        console.error('Error saving keywords batch:', error);
        throw new Error(`Failed to save keywords: ${error.message}`);
      }
    }
  }
}
