
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import debounce from "lodash.debounce";

export interface Keyword {
  keyword: string;
  category?: string;
  frequency: number;
}

export const useKeywords = () => {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [updateCount, setUpdateCount] = useState(0);
  const lastFetchedJobId = useRef<string | null>(null);

  const debouncedFetchKeywords = useCallback(
    debounce(async (jobId: string) => {
      // Prevent duplicate fetches for the same job
      if (jobId === lastFetchedJobId.current) {
        console.log('Skipping duplicate keyword fetch');
        return;
      }

      try {
        console.log('Fetching keywords for job ID:', jobId);
        const { data: keywordsData, error } = await supabase
          .from('extracted_keywords')
          .select('*')
          .eq('job_posting_id', jobId);

        if (error) throw error;

        if (keywordsData) {
          lastFetchedJobId.current = jobId;
          const formattedKeywords = keywordsData.map(k => ({
            keyword: k.keyword,
            category: k.category || undefined,
            frequency: k.frequency
          }));
          
          // Only update if keywords have changed
          if (JSON.stringify(formattedKeywords) !== JSON.stringify(keywords)) {
            setKeywords(formattedKeywords);
            setUpdateCount(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Error fetching keywords:', error);
        toast.error('Failed to fetch keywords');
      }
    }, 500),
    [keywords]
  );

  const handleRemoveKeyword = useCallback((keywordToRemove: string) => {
    setKeywords(prev => prev.filter(k => k.keyword !== keywordToRemove));
  }, []);

  const resetKeywords = useCallback(() => {
    setKeywords([]);
    setUpdateCount(0);
    lastFetchedJobId.current = null;
  }, []);

  return {
    keywords,
    updateCount,
    debouncedFetchKeywords,
    handleRemoveKeyword,
    resetKeywords
  };
};
