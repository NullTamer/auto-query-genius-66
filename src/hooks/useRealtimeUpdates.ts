
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
  const THROTTLE_DELAY = 1000; // 1 second minimum between updates

  const cleanupSubscription = useCallback(() => {
    if (channelRef.current) {
      console.log('Cleaning up subscription');
      channelRef.current.unsubscribe(); // Proper channel cleanup
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribed.current = false;
      isProcessingUpdate.current = false;
    }
  }, []);

  const handleChannelError = useCallback(() => {
    cleanupSubscription();
    
    if (retryCount.current >= MAX_RETRIES) {
      console.error('Max retries reached, giving up');
      toast.error('Failed to connect to job updates. Please try again.');
      onFailed('Connection lost after max retries');
      retryCount.current = 0; // Reset for potential future retries
      return;
    }

    const delay = Math.pow(2, retryCount.current) * 1000; // 1s, 2s, 4s, 8s, 16s
    retryCount.current++;
    
    console.log(`Retrying connection in ${delay}ms (attempt ${retryCount.current}/${MAX_RETRIES})`);
    setTimeout(() => {
      setupRealtimeSubscription();
    }, delay);
  }, [cleanupSubscription, onFailed]);

  const setupRealtimeSubscription = useCallback(async () => {
    if (channelRef.current || isSubscribed.current || !currentJobId) {
      console.log('Subscription already exists or no job ID');
      return;
    }

    console.log('Setting up new real-time subscription');
    isSubscribed.current = true;

    try {
      // First verify the job exists
      const { data, error } = await supabase
        .from('job_postings')
        .select('id')
        .eq('id', currentJobId)
        .single();

      if (error || !data) {
        console.error('Job not found:', error);
        onFailed('Job not found');
        return;
      }

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
                retryCount.current = 0; // Reset retry count on success
              } else if (posting.status === 'failed') {
                onFailed(posting.description);
                toast.error(`Job processing failed: ${posting.description || 'Unknown error'}`);
                retryCount.current = 0; // Reset retry count on explicit failure
              }
            } catch (error) {
              console.error('Error processing update:', error);
              
              if (error instanceof Error && error.message.includes('channel closed')) {
                handleChannelError();
              } else {
                toast.error('Error processing job update');
                onFailed('Error processing update');
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
            retryCount.current = 0; // Reset retry count on successful subscription
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Channel error occurred');
            handleChannelError();
          } else if (status === 'CLOSED') {
            console.error('Channel closed');
            handleChannelError();
          }
        });

      return () => {
        cleanupSubscription();
      };
    } catch (error) {
      console.error('Error setting up subscription:', error);
      onFailed('Error setting up subscription');
      isSubscribed.current = false;
    }
  }, [currentJobId, onProcessed, onFailed, handleChannelError, cleanupSubscription]);

  useEffect(() => {
    if (!currentJobId) return;
    
    let cleanup: (() => void) | undefined;
    setupRealtimeSubscription().then(result => {
      cleanup = result;
    });

    return () => {
      if (cleanup) cleanup();
      isProcessingUpdate.current = false;
    };
  }, [currentJobId, setupRealtimeSubscription]);

  return {
    cleanup: cleanupSubscription
  };
};
