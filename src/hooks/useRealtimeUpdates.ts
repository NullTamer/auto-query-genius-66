
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
  const retryCount = useRef(0);
  const MAX_RETRIES = 5;
  const THROTTLE_DELAY = 1000;

  const cleanupSubscription = useCallback(() => {
    if (channelRef.current) {
      console.log('Cleaning up subscription');
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribed.current = false;
      isProcessingUpdate.current = false;
    }
  }, []);

  const handleChannelError = useCallback(() => {
    if (retryCount.current >= MAX_RETRIES) {
      console.error('Max retries reached, giving up');
      toast.error('Failed to connect to job updates. Please try again.');
      onFailed('Connection lost after max retries');
      retryCount.current = 0;
      return;
    }

    const delay = Math.pow(2, retryCount.current) * 1000;
    retryCount.current++;
    
    console.log(`Retrying connection in ${delay}ms (attempt ${retryCount.current}/${MAX_RETRIES})`);
    setTimeout(() => {
      setupRealtimeSubscription();
    }, delay);
  }, []);

  const setupRealtimeSubscription = useCallback(() => {
    if (!currentJobId || channelRef.current) {
      console.log('Subscription exists or no job ID');
      return;
    }

    console.log('Setting up new real-time subscription for job:', currentJobId);
    
    try {
      channelRef.current = supabase
        .channel(`job-updates-${currentJobId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'job_postings',
            filter: `id=eq.${currentJobId}`
          },
          debounce(async (payload) => {
            console.log('Received update payload:', payload);
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
            lastProcessedState.current = newState;
            
            try {
              console.log('Processing job update:', posting);

              if (posting.status === 'processed') {
                // Add a small delay to ensure DB has time to write keywords
                await new Promise(resolve => setTimeout(resolve, 500));
                onProcessed(posting.id, posting.processed_at || '');
                toast.success('Job processing completed');
                retryCount.current = 0;
              } else if (posting.status === 'failed') {
                onFailed(posting.description);
                toast.error(`Job processing failed: ${posting.description || 'Unknown error'}`);
                retryCount.current = 0;
              }
            } catch (error) {
              console.error('Error processing update:', error);
              onFailed('Error processing update');
            } finally {
              isProcessingUpdate.current = false;
            }
          }, 500)
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to job updates');
            isSubscribed.current = true;
            retryCount.current = 0;
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Channel error occurred');
            cleanupSubscription();
            handleChannelError();
          }
        });

    } catch (error) {
      console.error('Error setting up subscription:', error);
      onFailed('Error setting up subscription');
      cleanupSubscription();
    }
  }, [currentJobId, onProcessed, onFailed, handleChannelError, cleanupSubscription]);

  useEffect(() => {
    if (!currentJobId) {
      cleanupSubscription();
      return;
    }
    
    setupRealtimeSubscription();
    
    return () => {
      cleanupSubscription();
    };
  }, [currentJobId, setupRealtimeSubscription, cleanupSubscription]);

  return {
    cleanup: cleanupSubscription
  };
};
