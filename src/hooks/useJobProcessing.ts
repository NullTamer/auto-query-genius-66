
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
      const session = await supabase.auth.getSession();
      console.log('Current session:', session);

      processingRef.current = true;
      setIsProcessing(true);
      setHasError(false);
      
      console.log('Invoking edge function to process job description');
      
      // Invoke the edge function instead of direct database manipulation
      const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
        body: { 
          jobDescription,
          // Pass the user ID if available, otherwise proceed as guest
          userId: session.data.session?.user?.id
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

  const handlePdfUpload = useCallback(async (file: File) => {
    if (processingRef.current) {
      console.log('Already processing a job, skipping');
      return null;
    }
    
    try {
      const session = await supabase.auth.getSession();
      console.log('Current session for PDF upload:', session);
      
      processingRef.current = true;
      setIsProcessing(true);
      setHasError(false);
      
      // First, upload the PDF to the job_pdfs bucket
      const timestamp = new Date().getTime();
      const fileName = `${timestamp}_${file.name.replace(/[^\x00-\x7F]/g, '')}`;
      
      console.log(`Uploading PDF file: ${fileName}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('job_pdfs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Error uploading PDF to storage:', uploadError);
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }
      
      console.log('PDF uploaded successfully:', uploadData);
      
      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('job_pdfs')
        .getPublicUrl(fileName);
      
      const pdfUrl = publicUrlData.publicUrl;
      console.log('PDF public URL:', pdfUrl);
      
      // Now invoke the parse-pdf edge function
      const { data, error } = await supabase.functions.invoke('parse-pdf', {
        body: { 
          pdfUrl,
          fileName,
          userId: session.data.session?.user?.id
        }
      });
      
      if (error) {
        console.error('Error invoking parse-pdf edge function:', error);
        throw error;
      }
      
      console.log('PDF processing response:', data);
      
      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Failed to process PDF');
      }
      
      const jobId = typeof data.jobId === 'string' ? parseInt(data.jobId, 10) : data.jobId;
      setCurrentJobId(jobId);
      setLastScrapeTime(new Date().toISOString());
      
      toast.success(`PDF "${file.name}" uploaded and processed successfully`);
      
      if (data.keywords && data.keywords.length > 0) {
        console.log('Keywords found in PDF:', data.keywords);
        // The caller should handle setting keywords if needed
      } else {
        toast.info('PDF is being processed. Results will appear shortly...');
      }
      
      return { 
        jobId, 
        keywords: data.keywords || [],
        pdfPath: data.pdfPath
      };
      
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error('Failed to process PDF file');
      setHasError(true);
      throw error;
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
    handlePdfUpload
  };
};
