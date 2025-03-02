import { useState, useCallback, useEffect } from "react";
import { useJobProcessing } from "@/hooks/useJobProcessing";
import { useKeywords } from "@/hooks/useKeywords";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { generateBooleanQuery } from "@/utils/queryUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Components
import AuthButton from "@/components/auth/AuthButton";
import PageHeader from "@/components/layout/PageHeader";
import JobInputSection from "@/components/job/JobInputSection";
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";
import CounterModule from "@/components/CounterModule";
import StatisticsModule from "@/components/StatisticsModule";

const Index = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [booleanQuery, setBooleanQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isPdfUploading, setIsPdfUploading] = useState(false);

  const {
    isProcessing,
    setIsProcessing,
    hasError,
    setHasError,
    lastScrapeTime,
    setLastScrapeTime,
    currentJobId,
    setCurrentJobId,
    processJob,
    processPdf
  } = useJobProcessing();

  const {
    keywords,
    updateCount,
    debouncedFetchKeywords,
    handleRemoveKeyword,
    resetKeywords,
    setKeywordsFromEdgeFunction
  } = useKeywords();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      console.log('Auth session initialized:', session ? 'logged in' : 'not logged in');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleProcessed = useCallback(async (jobId: number, processedAt: string) => {
    try {
      console.log('Job processed, fetching keywords for ID:', jobId);
      await debouncedFetchKeywords(jobId);
      setLastScrapeTime(processedAt);
      setIsProcessing(false);
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
    if (description) {
      toast.error(`Processing failed: ${description}`);
    } else {
      toast.error('Processing failed for unknown reason');
    }
  }, [setHasError, setIsProcessing, resetKeywords]);

  useRealtimeUpdates({
    currentJobId,
    onProcessed: handleProcessed,
    onFailed: handleFailed
  });

  const handlePdfUpload = async (file: File) => {
    try {
      resetKeywords();
      setBooleanQuery("");
      setIsPdfUploading(true);
      setHasError(false);
      
      console.log(`Starting PDF upload for: ${file.name} (${file.size} bytes)`);
      
      const result = await processPdf(file);
      
      if (!result) {
        throw new Error('Failed to process PDF - no result returned');
      }
      
      // Update the job description with the extracted text
      setJobDescription(result.extractedText);
      
      // If we got keywords directly, use them
      if (result.keywords && result.keywords.length > 0) {
        console.log('Setting keywords from PDF processing result:', result.keywords);
        setKeywordsFromEdgeFunction(result.keywords);
        setIsPdfUploading(false);
        toast.success('PDF processed successfully');
      } else {
        console.log('No keywords in PDF result, awaiting realtime updates');
        toast.success('PDF uploaded, processing content...');
      }
      
    } catch (error) {
      console.error('Error handling PDF upload:', error);
      toast.error('Failed to process PDF. Please try using the text input instead.');
      setHasError(true);
      setIsPdfUploading(false);
    }
  };

  const handleGenerateQuery = useCallback(async () => {
    console.log('Generate query button clicked');
    
    if (!jobDescription || jobDescription.trim() === '') {
      toast.error('Please enter a job description');
      return;
    }
    
    resetKeywords();
    setBooleanQuery("");
    setHasError(false);
    
    try {
      const jobId = await processJob(jobDescription);
      
      if (!jobId) {
        toast.error('Failed to start job processing');
        return;
      }
      
      console.log(`Job processing started for ID: ${jobId}`);
    } catch (error) {
      console.error('Error in handleGenerateQuery:', error);
      setHasError(true);
      toast.error('Failed to process job description');
    }
  }, [jobDescription, processJob, resetKeywords, setHasError]);

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

  useEffect(() => {
    console.log('Keywords updated, generating boolean query:', keywords);
    setBooleanQuery(generateBooleanQuery(keywords));
  }, [keywords]);

  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        <AuthButton session={session} />
        <PageHeader updateCount={updateCount} lastScrapeTime={lastScrapeTime} />

        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          <JobInputSection 
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            isProcessing={isProcessing || isPdfUploading}
            hasError={hasError}
            currentJobId={currentJobId}
            handleGenerateQuery={handleGenerateQuery}
            handleRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            handleFileUpload={handlePdfUpload}
          />
          <div className="space-y-6">
            <KeywordDisplay
              keywords={keywords}
              onRemoveKeyword={handleRemoveKeyword}
            />
            <StatisticsModule keywords={keywords} />
          </div>
        </div>

        <QueryPreview query={booleanQuery} />
        
        <div className="my-8">
          <CounterModule className="max-w-md mx-auto" />
        </div>
      </div>
    </div>
  );
};

export default Index;
