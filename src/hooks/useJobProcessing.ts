
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useJobProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const processingRef = useRef(false);

  const processJob = useCallback(async (jobDescription: string) => {
    if (processingRef.current) {
      console.log('Already processing a job, skipping');
      return null;
    }

    if (!jobDescription || jobDescription.trim() === '') {
      console.log('Empty job description, skipping');
      toast.error('Please enter a job description');
      return null;
    }

    try {
      const session = await supabase.auth.getSession();
      console.log('Current session:', session);

      processingRef.current = true;
      setIsProcessing(true);
      setHasError(false);
      
      console.log('Invoking edge function to process job description');
      
      // Invoke the edge function with the job description text
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          jobDescription,
          isPdf: false,
          // Pass the user ID if available, otherwise proceed as guest
          userId: session.data.session?.user?.id
        }
      });
      
      if (error) {
        console.error('Error invoking edge function:', error);
        throw error;
      }
      
      console.log('Edge function response:', data);
      
      if (!data || !data.success || !data.jobId) {
        throw new Error(data?.error || 'Failed to process job posting');
      }
      
      const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId;
      setCurrentJobId(jobId);
      setLastScrapeTime(new Date().toISOString());
      toast.success('Job processing initiated');
      console.log('Processing initiated for job ID:', jobId);
      return jobId;

    } catch (error) {
      console.error('Error processing job:', error);
      toast.error('Failed to process job posting');
      setHasError(true);
      return null;
    } finally {
      processingRef.current = false;
      // Note: We don't set isProcessing to false here because we want to 
      // wait for the realtime updates to indicate completion
    }
  }, []);

  // Add a new function to process PDFs
  const processPdf = useCallback(async (file: File) => {
    if (processingRef.current) {
      console.log('Already processing a job, skipping');
      return null;
    }

    try {
      const session = await supabase.auth.getSession();
      console.log('Current session for PDF processing:', session);

      processingRef.current = true;
      setIsProcessing(true);
      setHasError(false);
      
      console.log(`Processing PDF: ${file.name} (${file.size} bytes)`);
      
      // Read the file as ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
          if (fileReader.result instanceof ArrayBuffer) {
            resolve(fileReader.result);
          } else {
            reject(new Error('FileReader did not return an ArrayBuffer'));
          }
        };
        fileReader.onerror = () => reject(new Error('Failed to read PDF file'));
        fileReader.readAsArrayBuffer(file);
      });
      
      console.log('PDF file read as ArrayBuffer, sending to edge function...');
      
      // Convert ArrayBuffer to Uint8Array for transmission
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Invoke the edge function with the PDF content
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          isPdf: true,
          fileName: file.name,
          fileData: Array.from(uint8Array), // Convert to regular array for JSON serialization
          userId: session.data.session?.user?.id
        }
      });
      
      if (error) {
        console.error('Error invoking edge function:', error);
        throw new Error('Failed to process PDF: ' + error.message);
      }
      
      console.log('Edge function response for PDF:', data);
      
      if (!data || !data.success || !data.jobId) {
        throw new Error(data?.error || 'Failed to process PDF');
      }
      
      const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId;
      setCurrentJobId(jobId);
      setLastScrapeTime(new Date().toISOString());
      
      return {
        jobId,
        extractedText: data.extractedText || `[PDF Content: ${file.name}]`,
        keywords: data.keywords || []
      };
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      setHasError(true);
      throw error;
    } finally {
      processingRef.current = false;
      // We don't set isProcessing to false here - we wait for realtime updates
    }
  }, []);

  return {
    isProcessing,
    setIsProcessing,
    hasError,
    setHasError,
    lastScrapeTime,
    setLastScrapeTime,
    currentJobId,
    setCurrentJobId,
    processJob,
    processPdf
  };
};
