
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
      setIsProcessing(true);
      setIsPdfUploading(true);
      setHasError(false);
      
      console.log(`Uploading PDF: ${file.name} (${file.size} bytes)`);
      
      // Create form data for the PDF
      const formData = new FormData();
      formData.append('file', file);
      
      // Add user ID if authenticated
      const session = await supabase.auth.getSession();
      if (session.data.session?.user?.id) {
        formData.append('userId', session.data.session.user.id);
      }
      
      // Process PDF using edge function
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: formData,
      });
      
      if (error) {
        console.error('Error invoking edge function:', error);
        throw new Error('Failed to process PDF');
      }
      
      console.log('Edge function response:', data);
      
      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Failed to process PDF');
      }
      
      const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId;
      setCurrentJobId(jobId);
      setLastScrapeTime(new Date().toISOString());
      
      // Extract the text from the PDF and set it in the job description field
      if (data.textLength && data.textLength > 0) {
        setJobDescription(`[PDF Content: ${file.name}] - ${data.textLength} characters extracted`);
      }
      
      // Use keywords directly from edge function response if available
      if (data.keywords && data.keywords.length > 0) {
        console.log('Using keywords directly from edge function:', data.keywords);
        setKeywordsFromEdgeFunction(data.keywords);
        toast.success('PDF processed successfully');
      } else {
        // If no keywords in response, fetch them from database
        console.log('No keywords in response, fetching from database...');
        await debouncedFetchKeywords(jobId);
        toast.success('PDF processing completed');
      }
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF');
      setHasError(true);
    } finally {
      setIsProcessing(false);
      setIsPdfUploading(false);
    }
  };

  const handleGenerateQuery = useCallback(async () => {
    console.log('Generate query button clicked');
    resetKeywords();
    setBooleanQuery("");
    setIsProcessing(true);
    
    try {
      // Directly process job and handle the response
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
      // Convert the date to string format
      setLastScrapeTime(new Date().toISOString());
      
      // Use the keywords directly from the edge function response
      if (data.keywords && data.keywords.length > 0) {
        console.log('Using keywords directly from edge function:', data.keywords);
        setKeywordsFromEdgeFunction(data.keywords);
        setIsProcessing(false);
        toast.success('Job processing completed');
      } else {
        // If no keywords in response, try to fetch them from the database
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

  // Update boolean query whenever keywords change
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
