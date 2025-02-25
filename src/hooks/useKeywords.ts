
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
  const fetchInProgress = useRef(false);

  const debouncedFetchKeywords = useCallback(
    debounce(async (jobId: string) => {
      // Prevent duplicate fetches for the same job
      if (jobId === lastFetchedJobId.current) {
        console.log('Skipping duplicate keyword fetch');
        return;
      }

      // Prevent concurrent fetches
      if (fetchInProgress.current) {
        console.log('Fetch already in progress, skipping');
        return;
      }

      try {
        fetchInProgress.current = true;
        console.log('Fetching keywords for job ID:', jobId);
        
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          console.error('No active session');
          toast.error('Please log in to view keywords');
          return;
        }

        const { data: keywordsData, error } = await supabase
          .from('extracted_keywords')
          .select('*')
          .eq('job_posting_id', jobId);

        if (error) {
          console.error('Error fetching keywords:', error);
          throw error;
        }

        console.log('Received keywords data:', keywordsData);

        if (keywordsData) {
          lastFetchedJobId.current = jobId;
          const formattedKeywords = keywordsData.map(k => ({
            keyword: k.keyword,
            category: k.category || undefined,
            frequency: k.frequency || 1
          }));
          
          console.log('Setting formatted keywords:', formattedKeywords);
          setKeywords(formattedKeywords);
          setUpdateCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error fetching keywords:', error);
        toast.error('Failed to fetch keywords');
      } finally {
        fetchInProgress.current = false;
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
    lastFetchedJobId.current = null;
    fetchInProgress.current = false;
  }, []);

  return {
    keywords,
    updateCount,
    debouncedFetchKeywords,
    handleRemoveKeyword,
    resetKeywords
  };
};
