
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SearchProvider } from "@/components/job-search/types";

export const useJobProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const processingRef = useRef(false);

  const processJob = useCallback(async (
    jobDescription?: string, 
    jobUrl?: string, 
    query?: string,
    provider?: SearchProvider,
    location?: string
  ) => {
    if (processingRef.current) {
      console.log('Already processing a job, skipping');
      return null;
    }

    try {
      // Get the current session to include authentication
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting authentication session:', sessionError);
        // Continue as anonymous user if session can't be retrieved
      }
      
      processingRef.current = true;
      setIsProcessing(true);
      setHasError(false);
      
      console.log('Invoking edge function to process job', 
        jobDescription ? 'from description' : 
        jobUrl ? `from URL: ${jobUrl}` : 
        `from search query: ${query} (${provider})`);
      
      // Invoke the edge function with improved payload
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          jobDescription,
          jobUrl,
          query,
          provider,
          location,
          // Pass authentication data if available
          userId: sessionData?.session?.user?.id
        }
      });
      
      if (error) {
        console.error('Error invoking edge function:', error);
        throw error;
      }
      
      console.log('Edge function response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process job posting');
      }
      
      // If we have job results, set the current job ID to the first one
      if (data.jobs && data.jobs.length > 0) {
        const jobId = typeof data.jobs[0].jobId === 'string' 
          ? parseInt(data.jobs[0].jobId, 10) 
          : data.jobs[0].jobId;
          
        setCurrentJobId(jobId);
        console.log('Processing completed for job ID:', jobId);
      } else if (data.jobId) {
        // Backwards compatibility with old response format
        const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId;
        setCurrentJobId(jobId);
        console.log('Processing completed for job ID:', jobId);
      }
      
      setLastScrapeTime(new Date().toISOString());
      toast.success('Job processing completed');
      
      return data.jobs || (data.jobId ? [{ jobId: data.jobId, keywords: data.keywords }] : []);

    } catch (error) {
      console.error('Error processing job:', error);
      toast.error('Failed to process job posting');
      setHasError(true);
      return null;
    } finally {
      processingRef.current = false;
      setIsProcessing(false); // Ensure processing state is cleared in all cases
    }
  }, []);

  const refreshJobData = useCallback(async (jobId: number) => {
    if (!jobId) {
      console.error('Cannot refresh job data: No job ID provided');
      return false;
    }
    
    try {
      setIsProcessing(true);
      
      // Get fresh data for the job
      const { data, error } = await supabase
        .from('job_postings')
        .select('*, extracted_keywords(*)')
        .eq('id', jobId)
        .single();
      
      if (error) {
        console.error('Error refreshing job data:', error);
        throw error;
      }
      
      if (!data) {
        console.error('No job found with ID:', jobId);
        return false;
      }
      
      console.log('Job data refreshed successfully:', data);
      setLastScrapeTime(new Date().toISOString());
      return true;
    } catch (error) {
      console.error('Error refreshing job data:', error);
      toast.error('Failed to refresh job data');
      setHasError(true);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    setIsProcessing,
    hasError,
    setHasError,
    lastScrapeTime,
    setLastScrapeTime,
    currentJobId,
    setCurrentJobId,
    processJob,
    refreshJobData
  };
};
