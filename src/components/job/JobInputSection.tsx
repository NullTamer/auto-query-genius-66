
import { useState } from "react";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface JobInputSectionProps {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  isProcessing: boolean;
  hasError: boolean;
  currentJobId: number | null;
  handleGenerateQuery: () => void;
  handleRefresh: () => void;
  isRefreshing: boolean;
  onPdfSelect?: (file: File) => void;
}

const JobInputSection = ({
  jobDescription,
  setJobDescription,
  isProcessing,
  hasError,
  currentJobId,
  handleGenerateQuery,
  handleRefresh,
  isRefreshing,
  onPdfSelect
}: JobInputSectionProps) => {
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  
  return (
    <div className="space-y-4">
      <JobDescriptionInput
        value={jobDescription}
        onChange={setJobDescription}
        onSubmit={handleGenerateQuery}
        isProcessing={isProcessing || isPdfUploading}
        onFileSelect={(file) => {
          if (onPdfSelect) {
            setIsPdfUploading(true);
            onPdfSelect(file);
            // Note: isPdfUploading state will be reset when isProcessing changes
          }
        }}
      />
      <div className="flex items-center justify-center gap-4">
        {(isProcessing || isPdfUploading) && !hasError && (
          <div className="flex items-center gap-2 text-primary matrix-loader p-2">
            <span className="glitch">{isPdfUploading ? "Extracting text from PDF..." : "Processing job data..."}</span>
          </div>
        )}
        {currentJobId && (
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isProcessing || isPdfUploading}
            className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>
      {hasError && (
        <div className="text-center text-destructive cyber-card p-4">
          <p className="glitch">Failed to process job posting</p>
          <p className="text-sm mt-2">Try using the refresh button or submitting again</p>
        </div>
      )}
    </div>
  );
};

export default JobInputSection;
