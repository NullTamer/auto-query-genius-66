
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useJobProcessing } from "@/hooks/useJobProcessing";
import { useKeywords } from "@/hooks/useKeywords";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";

interface UseResumeProcessingProps {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  setBooleanQuery: (value: string) => void;
}

export const useResumeProcessing = ({ 
  jobDescription, 
  setJobDescription,
  setBooleanQuery 
}: UseResumeProcessingProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [currentPdfPath, setCurrentPdfPath] = useState<string | null>(null);

  const {
    isProcessing,
    setIsProcessing,
    hasError,
    setHasError,
    lastScrapeTime,
    setLastScrapeTime,
    currentJobId,
    setCurrentJobId,
  } = useJobProcessing();

  const {
    keywords,
    updateCount,
    debouncedFetchKeywords,
    handleRemoveKeyword,
    resetKeywords,
    setKeywordsFromEdgeFunction
  } = useKeywords();

  const handleProcessed = useCallback(async (jobId: number, processedAt: string) => {
    try {
      console.log('Job processed, fetching keywords for ID:', jobId);
      await debouncedFetchKeywords(jobId);
      setLastScrapeTime(processedAt);
      setIsProcessing(false);
      setPdfUploaded(false); 
    } catch (error) {
      console.error('Error handling processed job:', error);
      toast.error('Failed to fetch keywords');
      setHasError(true);
      setIsProcessing(false);
    }
  }, [debouncedFetchKeywords, setLastScrapeTime, setIsProcessing, setHasError]);

  const handleFailed = useCallback((description?: string) => {
    setHasError(true);
    setIsProcessing(false);
    resetKeywords();
    setPdfUploaded(false);
    if (description) {
      toast.error(`Processing failed: ${description}`);
    }
  }, [setHasError, setIsProcessing, resetKeywords]);

  // Set up realtime updates
  useRealtimeUpdates({
    currentJobId,
    onProcessed: handleProcessed,
    onFailed: handleFailed
  });

  const handlePdfUpload = useCallback(async (file: File) => {
    if (!file) return;
    
    try {
      setIsProcessing(true);
      setPdfUploaded(false);
      resetKeywords();
      setBooleanQuery("");
      
      const formData = new FormData();
      formData.append('pdf', file);
      
      console.log('Uploading PDF file to parse-pdf edge function');
      
      const { data, error } = await supabase.functions.invoke('parse-pdf', {
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (error) {
        console.error('Error invoking edge function:', error);
        throw error;
      }
      
      console.log('PDF processing response:', data);
      
      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Failed to process PDF');
      }
      
      const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId;
      setCurrentJobId(jobId);
      setCurrentPdfPath(data.pdfPath);
      setPdfUploaded(true);
      setLastScrapeTime(new Date().toISOString());
      
      toast.success(`PDF "${data.fileName}" uploaded successfully`);
      
      if (data.keywords && data.keywords.length > 0) {
        console.log('Using keywords directly from edge function:', data.keywords);
        setKeywordsFromEdgeFunction(data.keywords);
        setIsProcessing(false);
      } else {
        toast.info('PDF is being processed. Results will appear shortly...');
      }
      
      console.log('Processing started for job ID:', jobId);
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error('Failed to process PDF file');
      setHasError(true);
      setIsProcessing(false);
      setPdfUploaded(false);
    }
  }, [debouncedFetchKeywords, resetKeywords, setIsProcessing, setHasError, setKeywordsFromEdgeFunction, setCurrentJobId, setLastScrapeTime, setBooleanQuery]);

  const handleGenerateQuery = useCallback(async () => {
    console.log('Generate query button clicked');
    resetKeywords();
    setBooleanQuery("");
    setPdfUploaded(false);
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          jobDescription
        }
      });
      
      if (error) {
        console.error('Error invoking edge function:', error);
        setIsProcessing(false);
        setHasError(true);
        toast.error('Failed to process job posting');
        return;
      }
      
      console.log('Edge function response:', data);
      
      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Failed to process job posting');
      }
      
      const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId;
      setCurrentJobId(jobId);
      setLastScrapeTime(new Date().toISOString());
      
      if (data.keywords && data.keywords.length > 0) {
        console.log('Using keywords directly from edge function:', data.keywords);
        setKeywordsFromEdgeFunction(data.keywords);
        setIsProcessing(false);
        toast.success('Job processing completed');
      } else {
        console.log('No keywords in response, fetching from database...');
        await debouncedFetchKeywords(jobId);
        setIsProcessing(false);
        toast.success('Job processing completed');
      }
      
      console.log('Processing completed for job ID:', jobId);
    } catch (error) {
      console.error('Error in handleGenerateQuery:', error);
      setIsProcessing(false);
      setHasError(true);
      toast.error('Failed to process job description');
    }
  }, [jobDescription, debouncedFetchKeywords, resetKeywords, setIsProcessing, setHasError, setKeywordsFromEdgeFunction, setCurrentJobId, setLastScrapeTime, setBooleanQuery]);

  const handleRefresh = useCallback(async () => {
    if (!currentJobId || isRefreshing) return;
    setIsRefreshing(true);
    setHasError(false);
    
    try {
      console.log('Refreshing data for job ID:', currentJobId);
      await debouncedFetchKeywords(currentJobId);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Failed to refresh data');
      setHasError(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentJobId, isRefreshing, debouncedFetchKeywords, setHasError]);

  return {
    isProcessing,
    isRefreshing,
    hasError,
    lastScrapeTime,
    pdfUploaded,
    currentJobId,
    currentPdfPath,
    keywords,
    updateCount,
    handleGenerateQuery,
    handlePdfUpload,
    handleRefresh,
    handleRemoveKeyword,
    resetKeywords
  };
};
