
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lkevpnotoqmyeiasbeqt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZXZwbm90b3FteWVpYXNiZXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxMTcwODAsImV4cCI6MjA1NTY5MzA4MH0.lq7GzdVJEA1LbVasQRDyz80CHjFuqXtrfpRWmaEGMu8";

// Initialize dark mode based on saved preference, defaulting to dark mode
const initTheme = () => {
  if (typeof window !== 'undefined') {
    if (localStorage.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Default to dark mode
      document.documentElement.classList.add('dark');
      if (!('theme' in localStorage)) {
        localStorage.theme = 'dark';
      }
    }
  }
};

// Call the initialization function
initTheme();

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Function to toggle dark mode
export const toggleDarkMode = (isDarkMode: boolean) => {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
};

// Function to subscribe to realtime updates for job-related tables
export const subscribeToJobUpdates = (
  table: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      callback
    )
    .subscribe();
};

// Helper function to make job API search requests
export const searchJobs = async (
  searchTerm: string, 
  provider?: string
) => {
  try {
    const response = await supabase.functions.invoke('fetch-job-listings', {
      body: { 
        searchTerm, 
        provider
      }
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error searching jobs:', error);
    throw error;
  }
};

// Function to add job board API credentials
export const addJobApiCredentials = async (
  service: string,
  apiKey: string,
  apiSecret?: string,
  email?: string
) => {
  try {
    const { data, error } = await supabase
      .from('job_api_credentials')
      .upsert({
        service,
        api_key: apiKey,
        api_secret: apiSecret || null,
        email: email || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'service'
      })
      .select();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding API credentials:', error);
    throw error;
  }
};

// Function to get job board API credentials
export const getJobApiCredentials = async (service: string) => {
  try {
    const { data, error } = await supabase
      .from('job_api_credentials')
      .select('service, api_key, api_secret, email')
      .eq('service', service)
      .maybeSingle();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching API credentials:', error);
    return null;
  }
};

// Function to save a job posting to user's profile
export const saveJobPosting = async (jobData: {
  title: string;
  company: string;
  url: string;
  snippet: string;
  location?: string;
  source: string;
  salary?: string;
  jobType?: string;
  date?: string;
}) => {
  try {
    // First check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('You must be logged in to save job postings');
    }

    const userId = session.user.id;
    
    // Create job source if it doesn't exist
    const { data: sourceData, error: sourceError } = await supabase
      .from('job_sources')
      .select('id')
      .eq('source_name', jobData.source)
      .maybeSingle();
      
    if (sourceError) throw sourceError;
    
    let sourceId;
    
    if (!sourceData) {
      // Create new source
      const { data: newSource, error: newSourceError } = await supabase
        .from('job_sources')
        .insert({
          source_name: jobData.source,
          user_id: userId
        })
        .select('id')
        .single();
      
      if (newSourceError) throw newSourceError;
      sourceId = newSource.id;
    } else {
      sourceId = sourceData.id;
    }
    
    // Save the job posting
    const { data, error } = await supabase
      .from('job_postings')
      .insert({
        title: jobData.title,
        description: jobData.snippet,
        content: jobData.snippet,
        posting_url: jobData.url,
        source_id: sourceId,
        user_id: userId,
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (error) throw error;
    
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error saving job posting:', error);
    throw error;
  }
};
