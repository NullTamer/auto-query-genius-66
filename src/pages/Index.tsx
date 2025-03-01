
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
      
      // Create a FileReader to read the PDF content
      const fileReader = new FileReader();
      
      // Use an ArrayBuffer to handle binary PDF data
      fileReader.readAsArrayBuffer(file);
      
      // Process the file once loaded
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        fileReader.onload = () => {
          if (fileReader.result instanceof ArrayBuffer) {
            resolve(fileReader.result);
          } else {
            reject(new Error('FileReader did not return an ArrayBuffer'));
          }
        };
        fileReader.onerror = () => reject(new Error('Failed to read PDF file'));
      });
      
      console.log('PDF file read as ArrayBuffer, now processing...');
      
      // Get the current user session
      const session = await supabase.auth.getSession();
      
      // Create form data with the PDF file for uploading to the edge function
      const formData = new FormData();
      formData.append('file', new Blob([arrayBuffer]), file.name);
      
      // Invoke the edge function with the PDF content
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          isPdf: true,
          fileName: file.name,
          fileData: Array.from(new Uint8Array(arrayBuffer)),
          userId: session.data.session?.user?.id
        }
      });
      
      if (error) {
        console.error('Error invoking edge function:', error);
        throw new Error('Failed to process PDF: ' + error.message);
      }
      
      console.log('Edge function response:', data);
      
      if (!data || !data.success || !data.jobId) {
        throw new Error(data?.error || 'Failed to process PDF');
      }
      
      const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId;
      setCurrentJobId(jobId);
      setLastScrapeTime(new Date().toISOString());
      
      // Update the job description with a reference to the processed PDF
      setJobDescription(data.extractedText || `[PDF Content: ${file.name}]`);
      
      if (data.keywords && data.keywords.length > 0) {
        console.log('Using keywords directly from edge function:', data.keywords);
        setKeywordsFromEdgeFunction(data.keywords);
        toast.success('PDF processed successfully');
      } else {
        console.log('No keywords in response, fetching from database...');
        await debouncedFetchKeywords(jobId);
        toast.success('PDF processing completed');
      }
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF. Please try using the text input instead.');
      setHasError(true);
    } finally {
      setIsProcessing(false);
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
    setIsProcessing(true);
    setHasError(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          jobDescription,
          userId: session?.user?.id
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
      
      if (!data || !data.success || !data.jobId) {
        throw new Error(data?.error || 'Failed to process job posting');
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
    } catch (error) {
      console.error('Error in handleGenerateQuery:', error);
      setIsProcessing(false);
      setHasError(true);
      toast.error('Failed to process job description');
    }
  }, [jobDescription, session, debouncedFetchKeywords, resetKeywords, setIsProcessing, setHasError, setKeywordsFromEdgeFunction, setCurrentJobId, setLastScrapeTime]);

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
