
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useKeywords } from '@/hooks/useKeywords';
import { toast } from 'sonner';

export const useJobProcessingManager = (jobDescription: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { debouncedFetchKeywords, resetKeywords, setKeywordsFromEdgeFunction } = useKeywords();

  const handleGenerateQuery = useCallback(async () => {
    if (!jobDescription.trim() || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setHasError(false);
      resetKeywords();
      
      console.log('Invoking edge function with job description:', jobDescription.slice(0, 100) + '...');
      
      // Add proper headers to avoid CORS issues
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: { jobDescription },
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) {
        console.error('Error invoking edge function:', error);
        setHasError(true);
        toast.error('Failed to process job description: ' + error.message);
        setIsProcessing(false);
        return;
      }

      console.log('Edge function response:', data);
      
      if (data?.id) {
        setCurrentJobId(data.id);
        setLastScrapeTime(new Date().toISOString());
        
        // If keywords were returned directly, set them
        if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
          console.log('Setting keywords directly from edge function response:', data.keywords);
          setKeywordsFromEdgeFunction(data.keywords);
          setIsProcessing(false);
          toast.success('Job processed successfully');
        } else {
          // Otherwise fetch them from the database
          console.log('No keywords in direct response, fetching from database...');
          debouncedFetchKeywords(data.id);
          toast.success('Job processed successfully');
          
          // Set a safety timeout to clear processing state if keywords fetch takes too long
          setTimeout(() => {
            if (isProcessing) {
              setIsProcessing(false);
            }
          }, 10000); // Set a maximum wait time of 10 seconds
        }
      } else {
        setHasError(true);
        setIsProcessing(false);
        toast.error('No job data returned');
      }
    } catch (error) {
      console.error('Error processing job:', error);
      setHasError(true);
      setIsProcessing(false);
      toast.error('An error occurred while processing the job');
    }
  }, [jobDescription, isProcessing, debouncedFetchKeywords, resetKeywords, setKeywordsFromEdgeFunction]);

  const handleRefresh = useCallback(async () => {
    if (!currentJobId || isRefreshing) {
      return;
    }
    
    setIsRefreshing(true);
    setHasError(false);
    
    try {
      console.log('Refreshing keywords for job ID:', currentJobId);
      debouncedFetchKeywords(currentJobId);
      toast.success('Refreshing keywords');
    } catch (error) {
      console.error('Error refreshing keywords:', error);
      setHasError(true);
      toast.error('Failed to refresh keywords');
    } finally {
      // Set isRefreshing to false after a short delay to allow for visual feedback
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  }, [currentJobId, isRefreshing, debouncedFetchKeywords]);

  // Clear isProcessing if there's an error or when component unmounts
  useEffect(() => {
    return () => {
      if (isProcessing) {
        setIsProcessing(false);
      }
    };
  }, [isProcessing]);

  return {
    isProcessing,
    hasError,
    lastScrapeTime,
    currentJobId,
    handleGenerateQuery,
    handleRefresh,
    isRefreshing
  };
};
