
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
import StatisticsModule from "@/components/StatisticsModule";
import JobSearchModule from "@/components/JobSearchModule";

const Index = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [booleanQuery, setBooleanQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [session, setSession] = useState<any>(null);
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
    processJob
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
  }, [debouncedFetchKeywords, resetKeywords, setIsProcessing, setHasError, setKeywordsFromEdgeFunction, setCurrentJobId, setLastScrapeTime]);

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
  }, [jobDescription, debouncedFetchKeywords, resetKeywords, setIsProcessing, setHasError, setKeywordsFromEdgeFunction, setCurrentJobId, setLastScrapeTime]);

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
            isProcessing={isProcessing}
            hasError={hasError}
            currentJobId={currentJobId}
            handleGenerateQuery={handleGenerateQuery}
            handlePdfUpload={handlePdfUpload}
            handleRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            pdfUploaded={pdfUploaded}
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
        
        {booleanQuery && <JobSearchModule query={booleanQuery} session={session} />}
      </div>
    </div>
  );
};

export default Index;
