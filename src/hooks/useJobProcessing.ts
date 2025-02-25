
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
      
      // Changed from const to let so we can reassign it later
      let { data: sources } = await supabase
        .from('job_sources')
        .select('*')
        .limit(1);

      if (!sources?.length) {
        const { data: newSource, error: createError } = await supabase
          .from('job_sources')
          .insert({
            source_name: 'default',
            is_public: false
          })
          .select()
          .single();

        if (createError) throw createError;
        sources = [newSource];
      }

      const jobId = await JobScrapingService.processJobPosting(jobDescription, sources[0].id.toString());
      if (!jobId) throw new Error('Failed to get job ID');
      
      setCurrentJobId(jobId);
      toast.success('Job processing started');
      console.log('Processing started for job ID:', jobId);
      return jobId;

    } catch (error) {
      console.error('Error processing job:', error);
      toast.error('Failed to process job posting');
      setHasError(true);
      setIsProcessing(false); // Important: Clear processing state on error
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
