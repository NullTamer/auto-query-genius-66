
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeUpdatesProps {
  currentJobId: string | null;
  onProcessed: (jobId: string, processedAt: string) => void;
  onFailed: (description?: string) => void;
}

export const useRealtimeUpdates = ({
  currentJobId,
  onProcessed,
  onFailed,
}: RealtimeUpdatesProps) => {
  const channelRef = useRef<any>(null);

  // Effect to set up realtime subscription when the current job ID changes
  useEffect(() => {
    if (!currentJobId) {
      if (channelRef.current) {
        console.log("Cleanup: No current job ID");
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    console.log("Setting up realtime updates for job ID:", currentJobId);

    // Clean up any existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
    }

    // Set up a new channel for this job ID
    const numericJobId = parseInt(currentJobId, 10);
    channelRef.current = supabase
      .channel(`job-${numericJobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "job_postings",
          filter: `id=eq.${numericJobId}`,
        },
        (payload: any) => {
          console.log("Received job update:", payload);
          
          const { new: newJob } = payload;
          const status = newJob.status;
          
          console.log(`Job ${numericJobId} status: ${status}`);

          if (status === "processed") {
            onProcessed(
              currentJobId,
              newJob.processed_at || new Date().toISOString()
            );
          } else if (status === "failed") {
            onFailed(newJob.description);
          }
        }
      )
      .subscribe((status: string) => {
        console.log(`Subscription status for job-${numericJobId}:`, status);
      });

    // Check if the job is already processed
    const checkJobStatus = async () => {
      try {
        console.log("Checking job status for ID:", numericJobId);
        const { data, error } = await supabase
          .from("job_postings")
          .select("*")
          .eq("id", numericJobId)
          .single();

        if (error) {
          console.error("Error checking job status:", error);
          return;
        }

        console.log("Current job status:", data.status);

        if (data.status === "processed") {
          onProcessed(
            currentJobId,
            data.processed_at || new Date().toISOString()
          );
        } else if (data.status === "failed") {
          onFailed(data.description);
        }
      } catch (error) {
        console.error("Error in checkJobStatus:", error);
      }
    };

    // Check the current status
    checkJobStatus();

    // Clean up subscription when component unmounts or job ID changes
    return () => {
      if (channelRef.current) {
        console.log("Cleanup: Component unmounted or job ID changed");
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentJobId, onProcessed, onFailed]);
};
