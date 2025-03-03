
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Terminal, Upload, FileText, Trash2, AlertTriangle } from "lucide-react";
import mammoth from "mammoth";
import { toast } from "sonner";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFileUpload?: (file: File) => Promise<void>;
  isProcessing?: boolean;
  uploadedFileName?: string | null;
  uploadError?: string | null;
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  value,
  onChange,
  onSubmit,
  onFileUpload,
  isProcessing = false,
  uploadedFileName = null,
  uploadError = null
}) => {
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'docx') {
        // Process .docx file using mammoth
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        onChange(result.value);
        toast.success("DOCX file processed successfully");
      } else if (fileExtension === 'txt' || fileExtension === 'doc') {
        // Process text files using FileReader
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          onChange(text);
          toast.success("File processed successfully");
        };
        reader.readAsText(file);
      } else if (fileExtension === 'pdf') {
        // For PDF files, we upload to the server for processing
        if (onFileUpload) {
          try {
            toast.info("Uploading PDF for processing...");
            await onFileUpload(file);
          } catch (pdfError) {
            console.error("PDF upload failed:", pdfError);
            toast.error("PDF upload failed. Please try again.");
          }
        } else {
          toast.error("PDF upload is not enabled");
        }
      } else {
        toast.error("Unsupported file format. Please upload .txt, .doc, .docx, or .pdf files.");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error processing file. Please try again.");
    }

    // Clear the input value to allow uploading the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleClear = () => {
    onChange("");
    toast.success("Job description cleared");
  };

  return (
    <Card className="cyber-card p-4 md:p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
            <Terminal className="inline mr-2 h-5 w-5" />
            Job Description
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={isProcessing}
            >
              <Upload size={16} />
              Upload File
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
              onClick={handleClear}
              disabled={isProcessing || !value}
            >
              <Trash2 size={16} />
              Clear
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".txt,.doc,.docx,.pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
          </div>
        </div>
        
        {uploadedFileName && (
          <div className="flex items-center justify-between gap-2 text-primary p-2 bg-primary/10 rounded-md">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate max-w-[250px]">File: {uploadedFileName}</span>
            </div>
            {isProcessing && (
              <div className="text-xs animate-pulse">Processing...</div>
            )}
          </div>
        )}
        
        {uploadError && (
          <div className="flex items-center gap-2 text-amber-500 p-2 bg-amber-500/10 rounded-md">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{uploadError}</span>
          </div>
        )}
        
        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste your job description here or upload a file..."
            className="min-h-[200px] resize-none bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
            disabled={isProcessing}
          />
        </div>
        
        <Button
          onClick={onSubmit}
          className="w-full cyber-card bg-primary/20 hover:bg-primary/30 text-primary hover:text-primary-foreground hover:neon-glow transition-all"
          disabled={!value.trim() || isProcessing}
        >
          {isProcessing ? "Processing..." : "Generate Boolean Query"}
        </Button>
      </div>
    </Card>
  );
};

export default JobDescriptionInput;
