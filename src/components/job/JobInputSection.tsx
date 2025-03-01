
import { useState, useRef } from "react";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import { Button } from "@/components/ui/button";
import { RefreshCw, Upload, FileText, AlertTriangle, X } from "lucide-react";
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Only PDF files are supported");
      return;
    }

    // Check file size (limit to 5MB for better success rate with Gemini API)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("PDF file is too large (max 5MB). Please use a smaller file.");
      return;
    }

    setFileName(file.name);
    setIsUploading(true);
    setUploadProgress(10); // Start progress indication
    setErrorDetails(null);
    
    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const newValue = prev + Math.floor(Math.random() * 8);
        return newValue < 90 ? newValue : 90; // Cap at 90% until actually complete
      });
    }, 500);
    
    if (handleFileUpload) {
      try {
        await handleFileUpload(file);
        clearInterval(progressInterval);
        setUploadProgress(100);
        toast.success(`Successfully uploaded and processed ${file.name}`);
      } catch (error) {
        console.error("Error uploading PDF:", error);
        clearInterval(progressInterval);
        setUploadProgress(0);
        setErrorDetails(error.message || "Failed to process PDF");
        toast.error("Failed to process PDF file. The file might be too complex or corrupted.");
      } finally {
        setIsUploading(false);
        // Reset progress after a short delay
        setTimeout(() => {
          setUploadProgress(0);
        }, 2000);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setFileName(null);
    setErrorDetails(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <JobDescriptionInput
        value={jobDescription}
        onChange={setJobDescription}
        onSubmit={handleGenerateQuery}
        isProcessing={isProcessing || isUploading}
      />
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={triggerFileInput}
            disabled={isProcessing || isUploading}
            className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
          >
            <Upload className={`h-4 w-4 ${isUploading ? 'animate-spin' : ''}`} />
            {isUploading ? 'Uploading...' : 'Upload PDF'}
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
              <X 
                className="h-4 w-4 cursor-pointer hover:text-destructive" 
                onClick={clearFile}
              />
            </div>
          )}
        </div>
        
        {currentJobId && (
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isUploading}
            className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>
      
      {uploadProgress > 0 && (
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
      
      {(isProcessing || isUploading) && !hasError && (
        <div className="flex items-center justify-center gap-2 text-primary matrix-loader p-2">
          <span className="glitch">{isUploading ? 'Processing PDF...' : 'Processing job data...'}</span>
        </div>
      )}
      
      {hasError && (
        <div className="text-center text-destructive cyber-card p-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="glitch">Failed to process job posting</p>
          </div>
          <p className="text-sm">
            {errorDetails || "Try using a smaller or simpler PDF file, or manually paste the job description"}
          </p>
        </div>
      )}
    </div>
  );
};

export default JobInputSection;
