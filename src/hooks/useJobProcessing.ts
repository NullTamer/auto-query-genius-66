
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useJobProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const processingRef = useRef(false);

  const processJob = useCallback(async (jobDescription: string) => {
    if (processingRef.current) {
      console.log('Already processing a job, skipping');
      return null;
    }

    if (!jobDescription || jobDescription.trim() === '') {
      console.error('Job description is empty');
      toast.error('Please provide a job description');
      return null;
    }

    try {
      const session = await supabase.auth.getSession();
      console.log('Current session:', session);

      processingRef.current = true;
      setIsProcessing(true);
      setHasError(false);
      
      // Create a payload with debug information
      const payload = { 
        jobDescription: jobDescription.trim(),
        userId: session.data.session?.user?.id || null,
      };
      
      console.log('Preparing to invoke edge function with payload:', {
        descriptionLength: payload.jobDescription.length,
        firstChars: payload.jobDescription.substring(0, 50) + '...',
        hasUserId: !!payload.userId
      });
      
      // Invoke the edge function with enhanced error handling
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: payload
      });
      
      if (error) {
        console.error('Error invoking edge function:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          status: error.context?.status,
          statusText: error.context?.statusText
        });
        
        // Try to parse response body if available
        try {
          if (error.context?.body) {
            const reader = error.context.body.getReader();
            const { value } = await reader.read();
            const errorBody = new TextDecoder().decode(value);
            console.error('Error response body:', errorBody);
          }
        } catch (bodyError) {
          console.error('Failed to read error response body:', bodyError);
        }
        
        throw error;
      }
      
      console.log('Edge function response:', data);
      
      if (!data || !data.success || !data.jobId) {
        throw new Error(data?.error || 'Failed to process job posting');
      }
      
      const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId;
      setCurrentJobId(jobId);
      setLastScrapeTime(new Date().toISOString());
      toast.success('Job processing completed');
      console.log('Processing completed for job ID:', jobId);
      return jobId;

    } catch (error) {
      console.error('Error processing job:', error);
      toast.error('Failed to process job posting');
      setHasError(true);
      setIsProcessing(false); // Important: Clear processing state on error
      return null;
    } finally {
      processingRef.current = false;
      setIsProcessing(false); // Ensure processing state is cleared in all cases
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
    processJob
  };
};
