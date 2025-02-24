
import { useState, useCallback } from "react";
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
          setUpdateCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error fetching keywords:', error);
        toast.error('Failed to fetch keywords');
      }
    }, 500),
    []
  );

  const handleRemoveKeyword = useCallback((keywordToRemove: string) => {
    setKeywords(prev => prev.filter(k => k.keyword !== keywordToRemove));
  }, []);

  const resetKeywords = useCallback(() => {
    setKeywords([]);
    setUpdateCount(0);
  }, []);

  return {
    keywords,
    updateCount,
    debouncedFetchKeywords,
    handleRemoveKeyword,
    resetKeywords
  };
};
