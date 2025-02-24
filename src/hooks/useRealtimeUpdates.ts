
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
  const lastUpdateTime = useRef<number>(0);
  const THROTTLE_DELAY = 1000; // 1 second minimum between updates

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
          const now = Date.now();
          if (now - lastUpdateTime.current < THROTTLE_DELAY) {
            console.log('Throttling update, too soon since last update');
            return;
          }

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
          lastUpdateTime.current = now;
          
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
            
            // Reset subscription on critical errors
            if (error instanceof Error && error.message.includes('channel closed')) {
              console.log('Channel closed, cleaning up subscription');
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
                isSubscribed.current = false;
                // Attempt to reestablish subscription after a delay
                setTimeout(() => {
                  setupRealtimeSubscription();
                }, 1000);
              }
            }
          } finally {
            isProcessingUpdate.current = false;
          }
        }, 1000)
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to job updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error occurred');
          toast.error('Error connecting to real-time updates');
          // Cleanup on channel error
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
            isSubscribed.current = false;
          }
        }
      });

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribed.current = false;
        isProcessingUpdate.current = false;
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
