
import { useState, useEffect } from "react";
import { useJobProcessing } from "@/hooks/useJobProcessing";
import { useKeywords } from "@/hooks/useKeywords";
import { supabase } from "@/integrations/supabase/client";
import AuthButton from "@/components/auth/AuthButton";
import PageHeader from "@/components/layout/PageHeader";
import JobProcessingSection from "@/components/job/JobProcessingSection";
import KeywordResultsSection from "@/components/job/KeywordResultsSection";
import QueryPreviewSection from "@/components/job/QueryPreviewSection";
import CounterModule from "@/components/CounterModule";

const Index = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [session, setSession] = useState<any>(null);

  const {
    isProcessing,
    hasError,
    lastScrapeTime,
    currentJobId,
    handleGenerateQuery,
    handleRefresh,
    isRefreshing
  } = useJobProcessingManager(jobDescription);

  const { keywords, updateCount, handleRemoveKeyword } = useKeywords();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      console.log('Auth session initialized:', session ? 'logged in' : 'not logged in');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        <AuthButton session={session} />
        <PageHeader updateCount={updateCount} lastScrapeTime={lastScrapeTime} />

        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          <JobProcessingSection 
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            isProcessing={isProcessing}
            hasError={hasError}
            currentJobId={currentJobId}
            handleGenerateQuery={handleGenerateQuery}
            handleRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
          <KeywordResultsSection
            keywords={keywords}
            onRemoveKeyword={handleRemoveKeyword}
          />
        </div>

        <QueryPreviewSection keywords={keywords} />
        
        {/* Test Counter Module */}
        <div className="my-8">
          <CounterModule className="max-w-md mx-auto" />
        </div>
      </div>
    </div>
  );
};

export default Index;
