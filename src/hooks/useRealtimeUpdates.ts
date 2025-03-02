
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

      console.log('Setting up realtime updates for job ID:', currentJobId);

      channelRef.current = supabase
        .channel(`status-${currentJobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'job_postings',
            filter: `id=eq.${currentJobId}`
          },
          (payload) => {
            console.log('Status update received:', payload);
            const { new: newData } = payload;
            
            if (newData.status === 'processed' && newData.processed_at) {
              console.log('Job processed, triggering callback');
              onProcessed(currentJobId, newData.processed_at);
            } else if (newData.status === 'failed') {
              console.log('Job failed, triggering callback');
              onFailed(newData.description);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Realtime subscription status for job ${currentJobId}:`, status);
        });
    }

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up realtime subscription');
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentJobId, onProcessed, onFailed]);
};
