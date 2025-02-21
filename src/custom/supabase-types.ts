
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      job_sources: {
        Row: {
          id: string
          name: string
          base_url: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          base_url: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          base_url?: string
          created_at?: string
        }
      }
      job_postings: {
        Row: {
          id: string
          source_id: string
          external_id: string | null
          title: string
          description: string | null
          company: string | null
          location: string | null
          posting_url: string
          status: Database["public"]["Enums"]["job_posting_status"]
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_id: string
          external_id?: string | null
          title: string
          description?: string | null
          company?: string | null
          location?: string | null
          posting_url: string
          status?: Database["public"]["Enums"]["job_posting_status"]
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          external_id?: string | null
          title?: string
          description?: string | null
          company?: string | null
          location?: string | null
          posting_url?: string
          status?: Database["public"]["Enums"]["job_posting_status"]
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      extracted_keywords: {
        Row: {
          id: string
          job_posting_id: string
          keyword: string
          category: string | null
          frequency: number
          created_at: string
        }
        Insert: {
          id?: string
          job_posting_id: string
          keyword: string
          category?: string | null
          frequency?: number
          created_at?: string
        }
        Update: {
          id?: string
          job_posting_id?: string
          keyword?: string
          category?: string | null
          frequency?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      job_posting_status: "pending" | "processed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for working with the database
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type JobPostingStatus = Enums<'job_posting_status'>;

// Specific table types for easier access
export type JobSource = Tables<'job_sources'>;
export type JobPosting = Tables<'job_postings'>;
export type ExtractedKeyword = Tables<'extracted_keywords'>;
