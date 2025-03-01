
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Terminal, Upload, Loader2 } from "lucide-react";
import mammoth from "mammoth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isProcessing?: boolean;
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  value,
  onChange,
  onSubmit,
  isProcessing = false
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      // Check file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'docx') {
        // Process .docx file using mammoth
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        onChange(result.value);
        toast.success("DOCX file processed successfully");
      } else if (fileExtension === 'pdf') {
        // For PDF files, we need to use the edge function
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          // Show toast for longer processing time
          toast.info("Processing PDF file, this may take a moment...");
          
          // Call our Supabase edge function
          const { data, error } = await supabase.functions.invoke('extract-pdf-text', {
            body: formData, 
            // Make sure to set the correct content type for form data
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          if (error) {
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
          }
          
          if (data?.text) {
            onChange(data.text);
            toast.success("PDF file processed successfully");
          } else {
            throw new Error('No text extracted from PDF');
          }
        } catch (pdfError) {
          console.error("Error processing PDF:", pdfError);
          toast.error("Unable to extract text from PDF. Please try a different file format or copy the text manually.");
        }
      } else if (fileExtension === 'txt' || fileExtension === 'doc') {
        // Process text files using FileReader
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          onChange(text);
          toast.success("File processed successfully");
        };
        reader.readAsText(file);
      } else {
        toast.error("Unsupported file format. Please upload .txt, .doc, .docx, or .pdf files.");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error processing file. Please try again.");
    } finally {
      setIsUploading(false);
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
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".txt,.doc,.docx,.pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </div>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your job description here..."
          className="min-h-[200px] resize-none bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
          disabled={isUploading}
        />
        <Button
          onClick={onSubmit}
          className="w-full cyber-card bg-primary/20 hover:bg-primary/30 text-primary hover:text-primary-foreground hover:neon-glow transition-all"
          disabled={!value.trim() || isProcessing || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Processing Upload...
            </>
          ) : (
            "Generate Boolean Query"
          )}
        </Button>
      </div>
    </Card>
  );
};

export default JobDescriptionInput;
