
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

    try {
      processingRef.current = true;
      setIsProcessing(true);
      setHasError(false);
      
      console.log('Invoking edge function to process job description');
      
      // Get authentication token if available
      const { data: sessionData } = await supabase.auth.getSession();
      const authHeader = sessionData.session ? 
        { 'Authorization': `Bearer ${sessionData.session.access_token}` } : {};
      
      // Invoke the edge function with is_public set to true for anonymous access
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          jobDescription,
          is_public: true // Set this to true for anonymous access
        },
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (error) {
        console.error('Error invoking edge function:', error);
        throw error;
      }
      
      console.log('Edge function response:', data);
      
      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Failed to process job posting');
      }
      
      const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId;
      setCurrentJobId(jobId);
      setLastScrapeTime(new Date().toISOString());
      toast.success('Job processing completed');
      console.log('Processing completed for job ID:', jobId);
      
      // If keywords were returned directly from the edge function, handle them
      if (data.keywords && data.keywords.length > 0) {
        console.log('Keywords directly from edge function:', data.keywords);
      }
      
      return jobId;

    } catch (error) {
      console.error('Error processing job:', error);
      toast.error('Failed to process job posting');
      setHasError(true);
      setIsProcessing(false); // Important: Clear processing state on error
      return null;
    } finally {
      processingRef.current = false;
      setIsProcessing(false); // Ensure processing state is cleared in all cases
    }
  }, []);

  // Add PDF upload functionality
  const uploadPdf = useCallback(async (file: File): Promise<number | null> => {
    if (processingRef.current) {
      console.log('Already processing a job, skipping');
      return null;
    }

    try {
      processingRef.current = true;
      setIsProcessing(true);
      setHasError(false);

      // Generate a unique filename for the PDF
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      console.log('Uploading PDF file to storage:', filePath);

      // Get authentication token if available
      const { data: sessionData } = await supabase.auth.getSession();
      const authHeader = sessionData.session ? 
        { 'Authorization': `Bearer ${sessionData.session.access_token}` } : {};

      // Upload the file to Supabase Storage using anonymous access
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('job_pdfs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading PDF:', uploadError);
        throw uploadError;
      }

      const { path } = uploadData;
      console.log('PDF uploaded successfully to path:', path);
      toast.success('PDF uploaded, processing content...');

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('job_pdfs')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrlData.publicUrl);

      // Process the PDF using the edge function
      const { data: processData, error: processError } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          pdfUrl: publicUrlData.publicUrl,
          is_public: true // Set this to true for anonymous access
        },
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (processError) {
        console.error('Error processing PDF:', processError);
        throw processError;
      }

      console.log('PDF processing response:', processData);

      if (!processData.success || !processData.jobId) {
        throw new Error(processData.error || 'Failed to process PDF');
      }

      const jobId = typeof processData.jobId === 'string' ? parseInt(processData.jobId, 10) : processData.jobId;
      setCurrentJobId(jobId);
      setLastScrapeTime(new Date().toISOString());
      toast.success('PDF processed successfully');
      
      // If keywords were returned directly, handle them
      if (processData.keywords && processData.keywords.length > 0) {
        console.log('Keywords directly from PDF processing:', processData.keywords);
      }
      
      return jobId;
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast.error('Failed to process PDF');
      setHasError(true);
      return null;
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
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
    uploadPdf // Export the new PDF upload function
  };
};
