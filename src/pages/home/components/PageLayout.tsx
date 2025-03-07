
import React, { useState } from "react";

// Components
import AuthButton from "@/components/auth/AuthButton";
import PageHeader from "@/components/layout/PageHeader";
import JobInputSection from "@/components/job/JobInputSection";
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";
import StatisticsModule from "@/components/StatisticsModule";
import JobSearchModule from "@/components/JobSearchModule";
import NavigationPane from "@/components/layout/NavigationPane";
import UserGuide from "@/components/guide/UserGuide";
import { Keyword } from "@/hooks/useKeywords";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const [guideOpen, setGuideOpen] = useState(true);
  const hasNoContent = !jobDescription && keywords.length === 0;

  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <NavigationPane />
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 ml-16">
        <AuthButton session={session} />
        <PageHeader updateCount={updateCount} lastScrapeTime={lastScrapeTime} />

        {hasNoContent && <UserGuide />}

        {!hasNoContent && (
          <Collapsible open={guideOpen} onOpenChange={setGuideOpen} className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg text-primary font-medium">Guide</h3>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {guideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <UserGuide />
            </CollapsibleContent>
          </Collapsible>
        )}

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
