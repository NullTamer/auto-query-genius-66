
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JobScrapingService } from "@/services/JobScrapingService";
import { toast } from "sonner";

export const useJobProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const processingRef = useRef(false);

  const processJob = useCallback(async (jobDescription: string) => {
    if (processingRef.current) {
      console.log('Already processing a job, skipping');
      return null;
    }

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Please log in to process job postings');
        return null;
      }

      processingRef.current = true;
      setIsProcessing(true);
      setHasError(false);
      
      const { data: sources, error: sourcesError } = await supabase
        .from('job_sources')
        .select('*')
        .limit(1);

      if (sourcesError) throw sourcesError;
      if (!sources?.length) {
        toast.error('No job sources configured');
        return null;
      }

      const jobId = await JobScrapingService.processJobPosting(jobDescription, sources[0].id);
      setCurrentJobId(jobId);
      
      toast.success('Job processing started');
      console.log('Processing started for job ID:', jobId);
      return jobId;

    } catch (error) {
      console.error('Error processing job:', error);
      toast.error('Failed to process job posting');
      setHasError(true);
      return null;
    } finally {
      processingRef.current = false;
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
