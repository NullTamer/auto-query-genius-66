
import { useState } from "react";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface JobInputSectionProps {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  isProcessing: boolean;
  hasError: boolean;
  currentJobId: number | null;
  handleGenerateQuery: () => void;
  handlePdfUpload: (file: File) => Promise<void>;
  handleRefresh: () => void;
  isRefreshing: boolean;
  pdfUploaded: boolean;
}

const JobInputSection = ({
  jobDescription,
  setJobDescription,
  isProcessing,
  hasError,
  currentJobId,
  handleGenerateQuery,
  handlePdfUpload,
  handleRefresh,
  isRefreshing,
  pdfUploaded
}: JobInputSectionProps) => {
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    try {
      setUploadedFileName(file.name);
      await handlePdfUpload(file);
    } catch (error) {
      console.error("Error handling file upload:", error);
      setUploadedFileName(null);
      toast.error("Failed to process PDF file");
    }
  };

  return (
    <div className="space-y-4">
      <JobDescriptionInput
        value={jobDescription}
        onChange={setJobDescription}
        onSubmit={handleGenerateQuery}
        onFileUpload={handleFileSelect}
        isProcessing={isProcessing}
        uploadedFileName={uploadedFileName}
      />
      
      <div className="flex items-center justify-between gap-4 px-4">
        {isProcessing && !hasError && (
          <div className="flex items-center gap-2 text-primary matrix-loader p-2">
            <span className="glitch">Processing job data...</span>
          </div>
        )}
        
        {currentJobId && (
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="cyber-card flex items-center gap-2 hover:neon-glow transition-all ml-auto"
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
