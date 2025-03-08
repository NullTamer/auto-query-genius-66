export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      extracted_keywords: {
        Row: {
          created_at: string | null
          frequency: number | null
          id: number
          is_public: boolean | null
          job_posting_id: number | null
          keyword: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          frequency?: number | null
          id?: never
          is_public?: boolean | null
          job_posting_id?: number | null
          keyword?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          frequency?: number | null
          id?: never
          is_public?: boolean | null
          job_posting_id?: number | null
          keyword?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_keywords_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_api_credentials: {
        Row: {
          access_token: string | null
          api_key: string
          api_secret: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          service: string
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          api_key: string
          api_secret?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          service: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          api_key?: string
          api_secret?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          service?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      job_descriptions: {
        Row: {
          description: string | null
          id: number
          is_public: boolean | null
          user_id: string | null
        }
        Insert: {
          description?: string | null
          id?: never
          is_public?: boolean | null
          user_id?: string | null
        }
        Update: {
          description?: string | null
          id?: never
          is_public?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      job_postings: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          id: number
          is_public: boolean | null
          pdf_path: string | null
          posting_url: string | null
          processed_at: string | null
          source_id: number | null
          status: Database["public"]["Enums"]["job_posting_status"] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: never
          is_public?: boolean | null
          pdf_path?: string | null
          posting_url?: string | null
          processed_at?: string | null
          source_id?: number | null
          status?: Database["public"]["Enums"]["job_posting_status"] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: never
          is_public?: boolean | null
          pdf_path?: string | null
          posting_url?: string | null
          processed_at?: string | null
          source_id?: number | null
          status?: Database["public"]["Enums"]["job_posting_status"] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_job_source"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "job_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      job_sources: {
        Row: {
          created_at: string | null
          id: number
          is_public: boolean | null
          source_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          is_public?: boolean | null
          source_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          is_public?: boolean | null
          source_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      keywords: {
        Row: {
          id: number
          job_posting_id: number | null
          keyword: string | null
        }
        Insert: {
          id?: never
          job_posting_id?: number | null
          keyword?: string | null
        }
        Update: {
          id?: never
          job_posting_id?: number | null
          keyword?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keywords_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          company: string | null
          experience_level: string | null
          full_name: string | null
          id: string
          job_title: string | null
          location: string | null
          phone: string | null
          skills: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          experience_level?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          location?: string | null
          phone?: string | null
          skills?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          phone?: string | null
          skills?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string | null
          id: number
          is_saved: boolean | null
          job_posting_id: number | null
          provider: string | null
          query: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_saved?: boolean | null
          job_posting_id?: number | null
          provider?: string | null
          query: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_saved?: boolean | null
          job_posting_id?: number | null
          provider?: string | null
          query?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_resumes: {
        Row: {
          content: string
          created_at: string
          file_type: string
          filename: string
          id: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_type?: string
          filename: string
          id?: number
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_type?: string
          filename?: string
          id?: number
          user_id?: string
        }
        Relationships: []
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
