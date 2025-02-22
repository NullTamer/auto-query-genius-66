
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JobScrapingService } from "@/services/JobScrapingService";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JobPosting, ExtractedKeyword } from "@/custom/supabase-types";

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

  const fetchKeywords = useCallback(async (jobId: string) => {
    try {
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
      }
    } catch (error) {
      console.error('Error fetching keywords:', error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!currentJobId) return;

    setIsRefreshing(true);
    try {
      // Check job status
      const { data: jobPosting, error: jobError } = await supabase
        .from('job_postings')
        .select('*')
        .eq('id', currentJobId)
        .single();

      if (jobError) throw jobError;

      if (jobPosting.status === 'processed') {
        await fetchKeywords(currentJobId);
        setLastScrapeTime(jobPosting.processed_at);
        setIsProcessing(false);
        toast.success('Data refreshed successfully');
      } else if (jobPosting.status === 'failed') {
        setHasError(true);
        setIsProcessing(false);
        toast.error('Job processing failed');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [currentJobId, fetchKeywords]);

  useEffect(() => {
    if (!currentJobId) return;

    const jobPostingsChannel = supabase
      .channel('job-postings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_postings',
          filter: `id=eq.${currentJobId}`
        },
        async (payload) => {
          const posting = payload.new as JobPosting;
          console.log('Job posting update:', posting);
          
          if (posting.status === 'processed') {
            await fetchKeywords(currentJobId);
            setLastScrapeTime(posting.processed_at || null);
            setIsProcessing(false);
            toast.success('Job processing completed');
          } else if (posting.status === 'failed') {
            setHasError(true);
            setIsProcessing(false);
            toast.error('Job processing failed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobPostingsChannel);
    };
  }, [currentJobId, fetchKeywords]);

  const handleGenerateQuery = useCallback(async () => {
    try {
      setIsProcessing(true);
      setHasError(false);
      setKeywords([]);
      setBooleanQuery("");

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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold text-secondary mb-4">
            AutoSearchPro
          </h1>
          <p className="text-muted-foreground">
            Transform job descriptions into powerful Boolean search queries
          </p>
          {lastScrapeTime && (
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {new Date(lastScrapeTime).toLocaleString()}
            </p>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <JobDescriptionInput
              value={jobDescription}
              onChange={setJobDescription}
              onSubmit={handleGenerateQuery}
              isProcessing={isProcessing}
            />
            <div className="flex items-center justify-center gap-4">
              {isProcessing && !hasError && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing job data...</span>
                </div>
              )}
              {currentJobId && (
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="flex items-center gap-2"
                  disabled={isRefreshing || (!isProcessing && !hasError)}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>
            {hasError && (
              <div className="flex items-center justify-center gap-2 text-destructive">
                <p>Failed to process job posting</p>
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
