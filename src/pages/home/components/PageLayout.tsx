
import React from "react";

// Components
import AuthButton from "@/components/auth/AuthButton";
import PageHeader from "@/components/layout/PageHeader";
import JobInputSection from "@/components/job/JobInputSection";
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";
import StatisticsModule from "@/components/StatisticsModule";
import JobSearchModule from "@/components/JobSearchModule";
import NavigationPane from "@/components/layout/NavigationPane";
import { Keyword } from "@/hooks/useKeywords";

interface PageLayoutProps {
  session: any;
  jobDescription: string;
  setJobDescription: (value: string) => void;
  isProcessing: boolean;
  isRefreshing: boolean;
  hasError: boolean;
  lastScrapeTime: string | null;
  pdfUploaded: boolean;
  currentJobId: number | null;
  currentPdfPath: string | null;
  keywords: Keyword[];
  updateCount: number;
  booleanQuery: string;
  handleGenerateQuery: () => void;
  handlePdfUpload: (file: File) => Promise<void>;
  handleRefresh: () => void;
  handleRemoveKeyword: (keyword: string) => void;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  session,
  jobDescription,
  setJobDescription,
  isProcessing,
  isRefreshing,
  hasError,
  lastScrapeTime,
  pdfUploaded,
  currentJobId,
  keywords,
  updateCount,
  booleanQuery,
  handleGenerateQuery,
  handlePdfUpload,
  handleRefresh,
  handleRemoveKeyword,
}) => {
  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <NavigationPane />
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 ml-16">
        <AuthButton session={session} />
        <PageHeader updateCount={updateCount} lastScrapeTime={lastScrapeTime} />

        <div className="grid gap-6 md:gap-8 md:grid-cols-2">
          <JobInputSection 
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            isProcessing={isProcessing}
            hasError={hasError}
            currentJobId={currentJobId}
            handleGenerateQuery={handleGenerateQuery}
            handlePdfUpload={handlePdfUpload}
            handleRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            pdfUploaded={pdfUploaded}
          />
          <div className="space-y-6">
            <KeywordDisplay
              keywords={keywords}
              onRemoveKeyword={handleRemoveKeyword}
            />
            <StatisticsModule keywords={keywords} />
          </div>
        </div>

        <QueryPreview query={booleanQuery} />
        
        {booleanQuery && <JobSearchModule query={booleanQuery} keywords={keywords} />}
      </div>
    </div>
  );
};

export default PageLayout;
