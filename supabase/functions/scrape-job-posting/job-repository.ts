
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Create a new job posting in the database
export async function createJobPosting(
  description: string, 
  userId?: string,
  status: 'pending' | 'processing' | 'processed' | 'failed' = 'pending'
): Promise<number> {
  try {
    console.log(`Creating job posting with status: ${status}`)
    
    const { data, error } = await supabase
      .from('job_postings')
      .insert([
        { 
          description, 
          user_id: userId, 
          status,
          processed_at: status === 'processed' ? new Date().toISOString() : null
        }
      ])
      .select('id')
      .single()
    
    if (error) {
      console.error("Error creating job posting:", error)
      throw new Error(`Failed to create job posting: ${error.message}`)
    }
    
    if (!data || !data.id) {
      throw new Error("No job ID returned from database")
    }
    
    console.log(`Created job posting with ID: ${data.id}`)
    return data.id
  } catch (error) {
    console.error("Error in createJobPosting:", error)
    throw error
  }
}

// Update an existing job posting
export async function updateJobPosting(
  jobId: number, 
  status: 'pending' | 'processing' | 'processed' | 'failed'
): Promise<void> {
  try {
    console.log(`Updating job posting ${jobId} with status: ${status}`)
    
    const updates: any = { status }
    
    // Add processed_at timestamp if status is 'processed'
    if (status === 'processed') {
      updates.processed_at = new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('job_postings')
      .update(updates)
      .eq('id', jobId)
    
    if (error) {
      console.error("Error updating job posting:", error)
      throw new Error(`Failed to update job posting: ${error.message}`)
    }
    
    console.log(`Successfully updated job posting ${jobId}`)
  } catch (error) {
    console.error("Error in updateJobPosting:", error)
    throw error
  }
}
