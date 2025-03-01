
import { useState, useRef } from "react";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import { Button } from "@/components/ui/button";
import { RefreshCw, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

interface JobInputSectionProps {
  jobDescription: string;
  setJobDescription: (value: string) => void;
  isProcessing: boolean;
  hasError: boolean;
  currentJobId: number | null;
  handleGenerateQuery: () => void;
  handleRefresh: () => void;
  isRefreshing: boolean;
  handleFileUpload?: (file: File) => Promise<void>;
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
  handleFileUpload
}: JobInputSectionProps) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Only PDF files are supported");
      return;
    }

    setFileName(file.name);
    
    if (handleFileUpload) {
      try {
        await handleFileUpload(file);
      } catch (error) {
        console.error("Error uploading PDF:", error);
        toast.error("Failed to process PDF file");
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <JobDescriptionInput
        value={jobDescription}
        onChange={setJobDescription}
        onSubmit={handleGenerateQuery}
        isProcessing={isProcessing}
      />
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={triggerFileInput}
            disabled={isProcessing}
            className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
          >
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={onFileSelected}
            className="hidden"
          />
          
          {fileName && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="truncate max-w-[150px]">{fileName}</span>
            </div>
          )}
        </div>
        
        {currentJobId && (
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>
      
      {isProcessing && !hasError && (
        <div className="flex items-center justify-center gap-2 text-primary matrix-loader p-2">
          <span className="glitch">Processing job data...</span>
        </div>
      )}
      
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
