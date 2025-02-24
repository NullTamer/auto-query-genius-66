
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
  const isProcessingUpdate = useRef(false);

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
          table: 'job_postings',
          filter: `id=eq.${currentJobId}`
        },
        debounce(async (payload) => {
          if (isProcessingUpdate.current) {
            console.log('Already processing an update, skipping');
            return;
          }

          const posting = payload.new as JobPosting;
          const newState = `${posting.status}-${posting.processed_at}`;
          
          if (newState === lastProcessedState.current) {
            console.log('Skipping duplicate update');
            return;
          }

          isProcessingUpdate.current = true;
          
          try {
            console.log('Processing job update:', posting);
            lastProcessedState.current = newState;

            if (posting.status === 'processed') {
              await onProcessed(posting.id, posting.processed_at || '');
              toast.success('Job processing completed');
            } else if (posting.status === 'failed') {
              onFailed(posting.description);
              toast.error(`Job processing failed: ${posting.description || 'Unknown error'}`);
            }
          } catch (error) {
            console.error('Error processing update:', error);
            toast.error('Error processing update');
          } finally {
            isProcessingUpdate.current = false;
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
      isProcessingUpdate.current = false;
    };
  }, [currentJobId, setupRealtimeSubscription]);

  return {
    cleanup: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribed.current = false;
        isProcessingUpdate.current = false;
      }
    }
  };
};
