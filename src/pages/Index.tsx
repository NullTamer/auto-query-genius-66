
import { useState, useCallback, useEffect } from "react";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";
import { Terminal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJobProcessing } from "@/hooks/useJobProcessing";
import { useKeywords } from "@/hooks/useKeywords";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { generateBooleanQuery } from "@/utils/queryUtils";
import { toast } from "sonner";

const Index = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [booleanQuery, setBooleanQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    isProcessing,
    setIsProcessing,
    hasError,
    setHasError,
    lastScrapeTime,
    setLastScrapeTime,
    currentJobId,
    processJob
  } = useJobProcessing();

  const {
    keywords,
    updateCount,
    debouncedFetchKeywords,
    handleRemoveKeyword,
    resetKeywords
  } = useKeywords();

  const handleProcessed = useCallback(async (jobId: string, processedAt: string) => {
    try {
      await debouncedFetchKeywords(jobId);
      setLastScrapeTime(processedAt);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      toast.error('Failed to fetch keywords');
      setHasError(true);
    } finally {
      setIsProcessing(false);
    }
  }, [debouncedFetchKeywords, setLastScrapeTime, setIsProcessing, setHasError]);

  const handleFailed = useCallback((description?: string) => {
    setHasError(true);
    setIsProcessing(false);
    resetKeywords();
  }, [setHasError, setIsProcessing, resetKeywords]);

  useRealtimeUpdates({
    currentJobId,
    onProcessed: handleProcessed,
    onFailed: handleFailed
  });

  const handleGenerateQuery = useCallback(async () => {
    resetKeywords();
    setBooleanQuery("");
    const jobId = await processJob(jobDescription);
    if (jobId) {
      setIsProcessing(true);
      setHasError(false);
    }
  }, [jobDescription, processJob, resetKeywords, setIsProcessing, setHasError]);

  const handleRefresh = useCallback(async () => {
    if (!currentJobId || isRefreshing) return;
    setIsRefreshing(true);
    setHasError(false);
    
    try {
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
    setBooleanQuery(generateBooleanQuery(keywords));
  }, [keywords]);

  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        <div className="text-center mb-8 md:mb-12 animate-fade-in relative">
          <div className="absolute right-0 top-0">
            {updateCount > 0 && (
              <Badge 
                variant="outline"
                className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium cyber-card neon-glow data-stream"
                title={`Updates: ${updateCount}`}
              >
                {updateCount}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4 neon-glow glitch">
            AutoSearchPro
          </h1>
          <p className="text-muted-foreground">
            <Terminal className="inline mr-2 h-4 w-4" />
            Transform job descriptions into powerful Boolean search queries
          </p>
          {lastScrapeTime && (
            <p className="text-sm text-primary/70 mt-2 data-stream">
              Last updated: {new Date(lastScrapeTime).toLocaleString()}
            </p>
          )}
        </div>

        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <JobDescriptionInput
              value={jobDescription}
              onChange={setJobDescription}
              onSubmit={handleGenerateQuery}
              isProcessing={isProcessing}
            />
            <div className="flex items-center justify-center gap-4">
              {isProcessing && !hasError && (
                <div className="flex items-center gap-2 text-primary matrix-loader p-2">
                  <span className="glitch">Processing job data...</span>
                </div>
              )}
              {currentJobId && (
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>
            {hasError && (
              <div className="text-center text-destructive cyber-card p-4">
                <p className="glitch">Failed to process job posting</p>
                <p className="text-sm mt-2">Try using the refresh button or submitting again</p>
              </div>
            )}
          </div>
          <KeywordDisplay
            keywords={keywords}
            onRemoveKeyword={handleRemoveKeyword}
          />
        </div>

        <QueryPreview query={booleanQuery} />
      </div>
    </div>
  );
};

export default Index;
