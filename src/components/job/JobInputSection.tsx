
import { useState } from "react";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, File, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const [showUploadUI, setShowUploadUI] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

  const toggleUploadUI = () => {
    setShowUploadUI(!showUploadUI);
  };

  return (
    <div className="space-y-4">
      <JobDescriptionInput
        value={jobDescription}
        onChange={setJobDescription}
        onSubmit={handleGenerateQuery}
        onFileUpload={handlePdfUpload}
        isProcessing={isProcessing}
      />
      
      <div className="flex items-center justify-between gap-4 px-4">
        <Button
          variant="outline"
          onClick={toggleUploadUI}
          className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
        >
          <Upload className="h-4 w-4" />
          {showUploadUI ? "Hide Upload Options" : "Show Upload Options"}
        </Button>
        
        {isProcessing && !hasError && (
          <div className="flex items-center gap-2 text-primary matrix-loader p-2">
            <span className="glitch">Processing job data...</span>
          </div>
        )}
      </div>
      
      {showUploadUI && (
        <div className="cyber-card p-4 space-y-4 border border-primary/30 rounded-md">
          <h3 className="text-lg font-semibold text-primary">Upload PDF Job Description</h3>
          
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => document.getElementById("pdf-upload")?.click()}
                className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
                disabled={isProcessing}
              >
                <FileText className="h-4 w-4" />
                Select PDF File
              </Button>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
              
              {uploadedFileName && (
                <div className="flex items-center gap-2 text-primary">
                  <File className="h-4 w-4" />
                  <span className="text-sm truncate max-w-[200px]">{uploadedFileName}</span>
                </div>
              )}
            </div>
            
            {pdfUploaded && !isProcessing && (
              <div className="flex items-center gap-2 text-primary p-2 bg-primary/10 rounded-md">
                <FileText className="h-4 w-4" />
                <span>PDF uploaded successfully</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-center gap-4">
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
