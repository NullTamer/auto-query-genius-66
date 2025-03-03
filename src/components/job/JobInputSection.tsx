
import { useState } from "react";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, FileText } from "lucide-react";
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
  pdfFileName?: string | null;
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
  pdfUploaded,
  pdfFileName
}: JobInputSectionProps) => {
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    try {
      setUploadError(null);
      setUploadedFileName(file.name);
      
      // Clear job description to avoid conflicts between PDF and text inputs
      if (jobDescription.trim()) {
        setJobDescription(""); 
      }
      
      await handlePdfUpload(file);
    } catch (error) {
      console.error("Error handling file upload:", error);
      setUploadedFileName(null);
      setUploadError("Failed to process PDF file. Please try a different file or paste the job description manually.");
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
        uploadedFileName={uploadedFileName || pdfFileName}
        uploadError={uploadError}
        pdfUploaded={pdfUploaded}
      />
      
      <div className="flex items-center justify-between gap-4 px-4">
        {isProcessing && !hasError && (
          <div className="flex items-center gap-2 text-primary matrix-loader p-2">
            <span className="glitch">Processing job data...</span>
          </div>
        )}
        
        {pdfUploaded && pdfFileName && !isProcessing && (
          <div className="flex items-center gap-2 text-primary p-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Using uploaded PDF: {pdfFileName}</span>
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="glitch font-bold">Failed to process job posting</p>
          </div>
          <p className="text-sm mt-2">Try using the refresh button or submitting again</p>
        </div>
      )}
      
      {uploadError && (
        <div className="text-center text-amber-500 cyber-card p-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-bold">PDF Upload Issue</p>
          </div>
          <p className="text-sm">{uploadError}</p>
        </div>
      )}
    </div>
  );
};

export default JobInputSection;
