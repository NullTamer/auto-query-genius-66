
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Components
import PageLayout from "./components/PageLayout";
import { useResumeProcessing } from "./hooks/useResumeProcessing";
import { useSessionManagement } from "./hooks/useSessionManagement";

const IndexPage = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [booleanQuery, setBooleanQuery] = useState("");
  const location = useLocation();
  const resumeContentProcessed = useRef(false);
  
  const { session } = useSessionManagement();
  
  const {
    isProcessing,
    isRefreshing,
    hasError,
    lastScrapeTime,
    pdfUploaded,
    currentJobId,
    currentPdfPath,
    keywords,
    updateCount,
    handleGenerateQuery,
    handlePdfUpload,
    handleRefresh,
    handleRemoveKeyword,
    resetKeywords
  } = useResumeProcessing({ 
    jobDescription, 
    setJobDescription,
    setBooleanQuery
  });

  // Process resume content from navigation state
  useEffect(() => {
    const processResumeContent = async () => {
      const state = location.state as { resumeContent?: string } | null;
      
      if (state?.resumeContent && !resumeContentProcessed.current) {
        setJobDescription(state.resumeContent);
        resumeContentProcessed.current = true;
        
        toast.info("Processing resume content...");
      }
    };
    
    processResumeContent();
  }, [location]);

  // Update booleanQuery when keywords change
  useEffect(() => {
    const generateBooleanQuery = async () => {
      if (keywords.length > 0) {
        import('@/utils/queryUtils').then(({ generateBooleanQuery }) => {
          setBooleanQuery(generateBooleanQuery(keywords));
        });
      } else {
        setBooleanQuery("");
      }
    };
    
    generateBooleanQuery();
  }, [keywords]);

  return (
    <PageLayout
      session={session}
      jobDescription={jobDescription}
      setJobDescription={setJobDescription}
      isProcessing={isProcessing}
      isRefreshing={isRefreshing}
      hasError={hasError}
      lastScrapeTime={lastScrapeTime}
      pdfUploaded={pdfUploaded}
      currentJobId={currentJobId}
      currentPdfPath={currentPdfPath}
      keywords={keywords}
      updateCount={updateCount}
      booleanQuery={booleanQuery}
      handleGenerateQuery={handleGenerateQuery}
      handlePdfUpload={handlePdfUpload}
      handleRefresh={handleRefresh}
      handleRemoveKeyword={handleRemoveKeyword}
    />
  );
};

export default IndexPage;
