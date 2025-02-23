
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JobScrapingService } from "@/services/JobScrapingService";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";
import { toast } from "sonner";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { JobPosting, ExtractedKeyword } from "@/custom/supabase-types";

const generateBooleanQuery = (keywords: Array<{ keyword: string; category?: string; frequency: number }>) => {
  if (keywords.length === 0) return "";

  // Sort keywords by frequency and category
  const sortedKeywords = [...keywords].sort((a, b) => {
    if (b.frequency !== a.frequency) return b.frequency - a.frequency;
    if (a.category === 'skill' && b.category !== 'skill') return -1;
    if (b.category === 'skill' && a.category !== 'skill') return 1;
    return 0;
  });

  // Separate skills and requirements
  const skills = sortedKeywords.filter(k => k.category === 'skill').map(k => k.keyword);
  const requirements = sortedKeywords.filter(k => k.category === 'requirement').map(k => k.keyword);

  // Build query parts
  const essentialSkills = skills.slice(0, 3).join(" AND ");
  const optionalSkills = skills.slice(3).join(" OR ");
  const requirementsClauses = requirements.map(req => `"${req}"`).join(" OR ");

  // Combine parts
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
  const [updateCount, setUpdateCount] = useState(0);
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
        setUpdateCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching keywords:', error);
      toast.error('Failed to fetch keywords');
    }
  }, []);

  useEffect(() => {
    if (!currentJobId) return;

    console.log('Setting up real-time subscriptions for job ID:', currentJobId);

    const jobChannel = supabase
      .channel('job-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_postings',
          filter: `id=eq.${currentJobId}`
        },
        async (payload) => {
          console.log('Job posting update received:', payload);
          const posting = payload.new as JobPosting;
          
          if (posting.status === 'processed') {
            await fetchKeywords(currentJobId);
            setLastScrapeTime(posting.processed_at || null);
            setIsProcessing(false);
            toast.success('Job processing completed');
          } else if (posting.status === 'failed') {
            setHasError(true);
            setIsProcessing(false);
            toast.error(`Job processing failed: ${posting.description}`);
          }
        }
      )
      .subscribe();

    const keywordsChannel = supabase
      .channel('keyword-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'extracted_keywords',
          filter: `job_posting_id=eq.${currentJobId}`
        },
        () => {
          console.log('New keywords detected');
          fetchKeywords(currentJobId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(keywordsChannel);
    };
  }, [currentJobId, fetchKeywords]);

  const handleRefresh = useCallback(async () => {
    if (!currentJobId) return;

    setIsRefreshing(true);
    try {
      const { data: posting, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('id', currentJobId)
        .single();

      if (error) throw error;

      if (posting.status === 'processed') {
        await fetchKeywords(currentJobId);
        setLastScrapeTime(posting.processed_at || null);
        toast.success('Data refreshed successfully');
      } else if (posting.status === 'failed') {
        setHasError(true);
        toast.error(`Job processing failed: ${posting.description}`);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [currentJobId, fetchKeywords]);

  const handleGenerateQuery = useCallback(async () => {
    try {
      setIsProcessing(true);
      setHasError(false);
      setKeywords([]);
      setBooleanQuery("");
      setUpdateCount(0);

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

  const handleExportQuery = useCallback(() => {
    // Basic export implementation - to be enhanced with ATS integration
    const blob = new Blob([booleanQuery], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'boolean-query.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Query exported successfully');
  }, [booleanQuery]);

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
        <div className="text-center mb-12 animate-fade-in relative">
          <div className="absolute right-0 top-0">
            {updateCount > 0 && (
              <Badge 
                variant="secondary"
                className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium animate-pulse"
              >
                {updateCount}
              </Badge>
            )}
          </div>
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
                  disabled={isRefreshing || (!isProcessing && !hasError)}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>
            {hasError && (
              <div className="text-center text-destructive">
                <p>Failed to process job posting</p>
                <p className="text-sm">Try using the refresh button or submitting again</p>
              </div>
            )}
          </div>
          <KeywordDisplay
            keywords={keywords}
            onRemoveKeyword={handleRemoveKeyword}
          />
        </div>

        <div className="space-y-4">
          <QueryPreview query={booleanQuery} />
          {booleanQuery && (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                onClick={handleExportQuery}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Query
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
