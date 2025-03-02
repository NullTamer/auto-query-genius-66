
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeUpdatesProps {
  currentJobId: number | null;
  onProcessed: (jobId: number, processedAt: string) => void;
  onFailed: (description?: string) => void;
}

export const useRealtimeUpdates = ({
  currentJobId,
  onProcessed,
  onFailed
}: RealtimeUpdatesProps) => {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (currentJobId) {
      // Clean up any existing subscription
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      }

      console.log('[Realtime] Setting up subscription for job ID:', currentJobId);

      // Create a new channel for this job ID
      const channel = supabase
        .channel(`job-status-${currentJobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'job_postings',
            filter: `id=eq.${currentJobId}`
          },
          (payload) => {
            console.log('[Realtime] Received update:', payload);
            const { new: newData } = payload;
            
            if (newData.status === 'processed' && newData.processed_at) {
              console.log('[Realtime] Job processed successfully, calling onProcessed');
              onProcessed(currentJobId, newData.processed_at);
            } 
            else if (newData.status === 'failed') {
              console.log('[Realtime] Job failed, calling onFailed with:', newData.description);
              onFailed(newData.description || 'Unknown error occurred');
            }
            else {
              console.log('[Realtime] Job status update to:', newData.status);
            }
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Subscription status for job ${currentJobId}:`, status);
        });

      // Store the channel reference
      channelRef.current = channel;
    }

    // Cleanup function to unsubscribe when the component unmounts or currentJobId changes
    return () => {
      if (channelRef.current) {
        console.log('[Realtime] Cleaning up subscription');
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentJobId, onProcessed, onFailed]);
};
