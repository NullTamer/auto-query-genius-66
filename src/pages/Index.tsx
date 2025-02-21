
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JobScrapingService } from "@/services/JobScrapingService";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";
import { toast } from "sonner";
import type { JobPosting, ExtractedKeyword } from "@/custom/supabase-types";

const extractKeywords = (text: string): string[] => {
  // Simple keyword extraction for now - split by spaces and filter
  const words = text.toLowerCase().split(/\s+/);
  const stopwords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to"]);
  return [...new Set(words.filter(word => word.length > 2 && !stopwords.has(word)))];
};

const generateBooleanQuery = (keywords: string[]): string => {
  if (keywords.length === 0) return "";
  // Simple query generation for now
  const essentialTerms = keywords.slice(0, 3).join(" AND ");
  const optionalTerms = keywords.slice(3).join(" OR ");
  return `(${essentialTerms})${optionalTerms ? ` AND (${optionalTerms})` : ""}`;
};

const Index = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [booleanQuery, setBooleanQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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
          if (posting.status === 'processed') {
            toast.success(`Job posting processed: ${posting.title}`);
          } else if (posting.status === 'failed') {
            toast.error(`Failed to process job posting: ${posting.title}`);
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
          const newKeyword = (payload.new as ExtractedKeyword).keyword;
          setKeywords(prev => {
            if (!prev.includes(newKeyword)) {
              const updatedKeywords = [...prev, newKeyword];
              setBooleanQuery(generateBooleanQuery(updatedKeywords));
              return updatedKeywords;
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobPostingsChannel);
      supabase.removeChannel(keywordsChannel);
    };
  }, []);

  const handleGenerateQuery = useCallback(async () => {
    try {
      setIsProcessing(true);

      // Get job sources
      const { data: sources, error: sourcesError } = await supabase
        .from('job_sources')
        .select('*');

      if (sourcesError) throw sourcesError;
      if (!sources?.length) {
        toast.error('No job sources configured');
        return;
      }

      // Initial keywords extraction
      const extractedKeywords = extractKeywords(jobDescription);
      setKeywords(extractedKeywords);
      setBooleanQuery(generateBooleanQuery(extractedKeywords));

      // Process job posting
      await JobScrapingService.processJobPosting(sources[0].base_url, sources[0].id);
      
      toast.success('Job processing started. Keywords will update in real-time.');

    } catch (error) {
      console.error('Error processing job:', error);
      toast.error('Failed to process job posting');
    } finally {
      setIsProcessing(false);
    }
  }, [jobDescription]);

  const handleRemoveKeyword = useCallback((keyword: string) => {
    setKeywords(prev => {
      const newKeywords = prev.filter(k => k !== keyword);
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
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <JobDescriptionInput
            value={jobDescription}
            onChange={setJobDescription}
            onSubmit={handleGenerateQuery}
          />
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
