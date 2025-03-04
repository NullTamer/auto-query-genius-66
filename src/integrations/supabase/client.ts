
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lkevpnotoqmyeiasbeqt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZXZwbm90b3FteWVpYXNiZXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxMTcwODAsImV4cCI6MjA1NTY5MzA4MH0.lq7GzdVJEA1LbVasQRDyz80CHjFuqXtrfpRWmaEGMu8";

// Initialize dark mode based on saved preference
const initTheme = () => {
  if (typeof window !== 'undefined') {
    if (localStorage.theme === 'dark' || 
        (!('theme' in localStorage) && 
         window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
