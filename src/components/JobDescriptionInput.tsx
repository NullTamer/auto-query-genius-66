
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Terminal, Upload } from "lucide-react";
import mammoth from "mammoth";
import { toast } from "sonner";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFileUpload?: (file: File) => Promise<void>;
  isProcessing?: boolean;
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  value,
  onChange,
  onSubmit,
  onFileUpload,
  isProcessing = false
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
        // For PDF files, we'll upload to Supabase and process on the server
        if (onFileUpload) {
          await onFileUpload(file);
          toast.success("PDF uploaded for processing");
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
            >
              <Upload size={16} />
              Upload
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".txt,.doc,.docx,.pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your job description here..."
          className="min-h-[200px] resize-none bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
        />
        <Button
          onClick={onSubmit}
          className="w-full cyber-card bg-primary/20 hover:bg-primary/30 text-primary hover:text-primary-foreground hover:neon-glow transition-all"
          disabled={!value.trim() && !isProcessing}
        >
          Generate Boolean Query
        </Button>
      </div>
    </Card>
  );
};

export default JobDescriptionInput;
