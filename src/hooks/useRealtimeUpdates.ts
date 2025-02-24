
import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { JobPosting } from "@/custom/supabase-types";
import { toast } from "sonner";
import debounce from "lodash.debounce";

interface UseRealtimeUpdatesProps {
  currentJobId: string | null;
  onProcessed: (jobId: string, processedAt: string) => void;
  onFailed: (description?: string) => void;
}

export const useRealtimeUpdates = ({
  currentJobId,
  onProcessed,
  onFailed
}: UseRealtimeUpdatesProps) => {
  const lastProcessedState = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribed = useRef(false);

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
            onProcessed(posting.id, posting.processed_at || '');
            toast.success('Job processing completed');
          } else if (posting.status === 'failed') {
            onFailed(posting.description);
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
  }, [currentJobId, onProcessed, onFailed]);

  useEffect(() => {
    if (!currentJobId) return;
    
    const cleanup = setupRealtimeSubscription();
    return () => {
      if (cleanup) cleanup();
    };
  }, [currentJobId, setupRealtimeSubscription]);

  return {
    cleanup: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribed.current = false;
      }
    }
  };
};
