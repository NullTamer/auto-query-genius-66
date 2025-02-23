import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JobScrapingService } from "@/services/JobScrapingService";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";
import { toast } from "sonner";
import { Terminal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { JobPosting } from "@/custom/supabase-types";
import debounce from "lodash.debounce";

const generateBooleanQuery = (keywords: Array<{ keyword: string; category?: string; frequency: number }>) => {
  if (keywords.length === 0) return "";

  const sortedKeywords = [...keywords].sort((a, b) => {
    if (b.frequency !== a.frequency) return b.frequency - a.frequency;
    if (a.category === 'skill' && b.category !== 'skill') return -1;
    if (b.category === 'skill' && a.category !== 'skill') return 1;
    return 0;
  });

  const skills = sortedKeywords.filter(k => k.category === 'skill').map(k => k.keyword);
  const requirements = sortedKeywords.filter(k => k.category === 'requirement').map(k => k.keyword);

  const essentialSkills = skills.slice(0, 3).join(" AND ");
  const optionalSkills = skills.slice(3).join(" OR ");
  const requirementsClauses = requirements.map(req => `"${req}"`).join(" OR ");

  const parts = [];
  if (essentialSkills) parts.push(`(${essentialSkills})`);
  if (optionalSkills) parts.push(`(${optionalSkills})`);
  if (requirementsClauses) parts.push(`(${requirementsClauses})`);

  return parts.join(" AND ");
};

const Index = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [keywords, setKeywords] = useState<Array<{ keyword: string; category?: string; frequency: number }>>([]);
  const [booleanQuery, setBooleanQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const lastProcessedState = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribed = useRef(false);

  const debouncedFetchKeywords = useCallback(
    debounce(async (jobId: string) => {
      try {
        console.log('Fetching keywords for job ID:', jobId);
        const { data: keywordsData, error } = await supabase
          .from('extracted_keywords')
          .select('*')
          .eq('job_posting_id', jobId);

        if (error) throw error;

        if (keywordsData) {
          const formattedKeywords = keywordsData.map(k => ({
            keyword: k.keyword,
            category: k.category || undefined,
            frequency: k.frequency
          }));
          setKeywords(formattedKeywords);
          setBooleanQuery(generateBooleanQuery(formattedKeywords));
          setUpdateCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error fetching keywords:', error);
        toast.error('Failed to fetch keywords');
      }
    }, 500),
    []
  );

  const handleRefresh = useCallback(async () => {
    if (!currentJobId || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const { data: posting, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('id', currentJobId)
        .single();

      if (error) throw error;

      if (posting.status === 'processed') {
        await debouncedFetchKeywords(currentJobId);
        setLastScrapeTime(posting.processed_at);
        setIsProcessing(false);
        toast.success('Data refreshed successfully');
      } else if (posting.status === 'failed') {
        setHasError(true);
        setIsProcessing(false);
        toast.error(`Job processing failed: ${posting.description || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [currentJobId, debouncedFetchKeywords, isRefreshing]);

  const setupRealtimeSubscription = useCallback(() => {
    if (channelRef.current || isSubscribed.current || !currentJobId) {
      console.log('Subscription already exists or no job ID');
      return;
    }

    console.log('Setting up new real-time subscription');
    isSubscribed.current = true;
    
    channelRef.current = supabase
      .channel('job-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_postings'
        },
        debounce(async (payload) => {
          const posting = payload.new as JobPosting;
          
          if (posting.id !== currentJobId) {
            console.log('Ignoring update for different job:', posting.id);
            return;
          }

          const newState = `${posting.status}-${posting.processed_at}`;
          
          if (newState === lastProcessedState.current) {
            console.log('Skipping duplicate update');
            return;
          }
          
          lastProcessedState.current = newState;
          console.log('Processing job update:', posting);

          if (posting.status === 'processed') {
            await debouncedFetchKeywords(posting.id);
            setLastScrapeTime(posting.processed_at || null);
            setIsProcessing(false);
            toast.success('Job processing completed');
          } else if (posting.status === 'failed') {
            setHasError(true);
            setIsProcessing(false);
            toast.error(`Job processing failed: ${posting.description || 'Unknown error'}`);
          }
        }, 1000)
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribed.current = false;
      }
    };
  }, [currentJobId, debouncedFetchKeywords]);

  useEffect(() => {
    if (!currentJobId) return;
    
    const cleanup = setupRealtimeSubscription();
    return () => {
      if (cleanup) cleanup();
    };
  }, [currentJobId, setupRealtimeSubscription]);

  const handleGenerateQuery = useCallback(async () => {
    try {
      setIsProcessing(true);
      setHasError(false);
      setKeywords([]);
      setBooleanQuery("");
      setUpdateCount(0);
      lastProcessedState.current = null;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribed.current = false;
      }

      const { data: sources, error: sourcesError } = await supabase
        .from('job_sources')
        .select('*');

      if (sourcesError) throw sourcesError;
      if (!sources?.length) {
        toast.error('No job sources configured');
        return;
      }

      const jobId = await JobScrapingService.processJobPosting(jobDescription, sources[0].id);
      setCurrentJobId(jobId);
      
      toast.success('Job processing started');
      console.log('Processing started for job ID:', jobId);

    } catch (error) {
      console.error('Error processing job:', error);
      toast.error('Failed to process job posting');
      setIsProcessing(false);
      setHasError(true);
    }
  }, [jobDescription]);

  const handleRemoveKeyword = useCallback((keywordToRemove: string) => {
    setKeywords(prev => {
      const newKeywords = prev.filter(k => k.keyword !== keywordToRemove);
      setBooleanQuery(generateBooleanQuery(newKeywords));
      return newKeywords;
    });
  }, []);

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
