
import { useState, useCallback, useRef, useEffect } from "react";
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
  const channelRef = useRef<any>(null);

  const setupRealtimeSubscription = useCallback((jobId: string) => {
    if (channelRef.current) {
      console.log('Cleaning up existing subscription');
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
    }

    console.log('Setting up realtime subscription for job ID:', jobId);
    channelRef.current = supabase
      .channel(`keywords-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'extracted_keywords',
          filter: `job_posting_id=eq.${jobId}`
        },
        (payload) => {
          console.log('Received keywords update:', payload);
          // Trigger a fetch when we get an update
          debouncedFetchKeywords(jobId);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });
  }, []);

  const debouncedFetchKeywords = useCallback(
    debounce(async (jobId: string) => {
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
          .eq('job_posting_id', jobId)
          .order('frequency', { ascending: false });

        if (error) {
          console.error('Error fetching keywords:', error);
          throw error;
        }

        console.log('Received keywords data:', keywordsData);

        if (keywordsData && keywordsData.length > 0) {
          lastFetchedJobId.current = jobId;
          const formattedKeywords = keywordsData.map(k => ({
            keyword: k.keyword,
            category: k.category || undefined,
            frequency: k.frequency || 1
          }));
          
          console.log('Setting formatted keywords:', formattedKeywords);
          setKeywords(formattedKeywords);
          setUpdateCount(prev => prev + 1);
        } else {
          console.log('No keywords found for job ID:', jobId);
          // Wait a bit and try again if no keywords found
          setTimeout(() => {
            debouncedFetchKeywords(jobId);
          }, 2000);
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
    
    // Cleanup realtime subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    keywords,
    updateCount,
    debouncedFetchKeywords: useCallback((jobId: string) => {
      setupRealtimeSubscription(jobId);
      debouncedFetchKeywords(jobId);
    }, [setupRealtimeSubscription, debouncedFetchKeywords]),
    handleRemoveKeyword,
    resetKeywords
  };
};
