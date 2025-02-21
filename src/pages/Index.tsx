
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JobScrapingService } from "@/services/JobScrapingService";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Subscribe to real-time updates for job postings and keywords
  useEffect(() => {
    const jobPostingsChannel = supabase
      .channel('job-postings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_postings'
        },
        (payload) => {
          const posting = payload.new as JobPosting;
          if (posting.id === currentJobId) {
            if (posting.status === 'processed') {
              setLastScrapeTime(posting.processed_at || null);
              toast.success(`Job posting processed: ${posting.title}`);
              setIsProcessing(false);
            } else if (posting.status === 'failed') {
              toast.error(`Failed to process job posting: ${posting.title}`);
              setIsProcessing(false);
            }
          }
        }
      )
      .subscribe();

    const keywordsChannel = supabase
      .channel('extracted-keywords')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'extracted_keywords'
        },
        (payload) => {
          const newKeyword = payload.new as ExtractedKeyword;
          if (newKeyword.job_posting_id === currentJobId) {
            setKeywords(prev => {
              const updatedKeywords = [...prev, {
                keyword: newKeyword.keyword,
                category: newKeyword.category || undefined,
                frequency: newKeyword.frequency
              }];
              setBooleanQuery(generateBooleanQuery(updatedKeywords));
              return updatedKeywords;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobPostingsChannel);
      supabase.removeChannel(keywordsChannel);
    };
  }, [currentJobId]);

  const handleGenerateQuery = useCallback(async () => {
    try {
      setIsProcessing(true);
      setKeywords([]);
      setBooleanQuery("");

      // Get job sources
      const { data: sources, error: sourcesError } = await supabase
        .from('job_sources')
        .select('*');

      if (sourcesError) throw sourcesError;
      if (!sources?.length) {
        toast.error('No job sources configured');
        return;
      }

      // Process job posting with actual description
      const jobId = await JobScrapingService.processJobPosting(jobDescription, sources[0].id);
      setCurrentJobId(jobId);
      
      toast.success('Job processing started. Keywords will update in real-time.');

    } catch (error) {
      console.error('Error processing job:', error);
      toast.error('Failed to process job posting');
      setIsProcessing(false);
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
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing job data...</span>
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
