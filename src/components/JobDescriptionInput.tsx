
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Terminal, Upload, FileText, Trash2 } from "lucide-react";
import mammoth from "mammoth";
import { toast } from "sonner";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFileUpload?: (file: File) => Promise<void>;
  isProcessing?: boolean;
  uploadedFileName?: string | null;
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  value,
  onChange,
  onSubmit,
  onFileUpload,
  isProcessing = false,
  uploadedFileName = null
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
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const arrayBuffer = e.target?.result as ArrayBuffer;
            console.log("PDF arrayBuffer size:", arrayBuffer.byteLength);
            if (!arrayBuffer) {
              console.error("PDF arrayBuffer is undefined");
              toast.error("Failed to read PDF file");
              return;
            }
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            console.log("PDF loading task created");
            const pdf = await loadingTask.promise;
            console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
            let fullText = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const page = await pdf.getPage(pageNum);
              const textContent = await page.getTextContent();
              fullText += textContent.items.map(item => 'str' in item ? item.str : '').join(' ') + ' ';
            }
            onChange(fullText.trim());
            toast.success("PDF processed successfully");
          } catch (pdfError) {
            console.error("PDF.js processing error:", pdfError);
            toast.warning("Using fallback method for PDF processing");
            try {
              const textReader = new FileReader();
              textReader.onload = (textEvent) => {
                const text = textEvent.target?.result as string;
                if (text && text.trim() !== '') {
                  onChange(text);
                  toast.success("PDF text extracted using fallback method");
                } else {
                  toast.error("Could not extract text from PDF");
                }
              };
              textReader.readAsText(file);
            } catch (textError) {
              console.error("Fallback text extraction failed:", textError);
              toast.error("Could not process PDF file");
            }
          }
        };
        reader.readAsArrayBuffer(file);
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
            />
          </div>
        </div>
        
        {uploadedFileName && (
          <div className="flex items-center justify-between gap-2 text-primary p-2 bg-primary/10 rounded-md">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate max-w-[250px]">File: {uploadedFileName}</span>
            </div>
          </div>
        )}
        
        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste your job description here or upload a file..."
            className="min-h-[200px] resize-none bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
          />
        </div>
        
        <Button
          onClick={onSubmit}
          className="w-full cyber-card bg-primary/20 hover:bg-primary/30 text-primary hover:text-primary-foreground hover:neon-glow transition-all"
          disabled={!value.trim() && !isProcessing}
        >
          {isProcessing ? "Processing..." : "Generate Boolean Query"}
        </Button>
      </div>
    </Card>
  );
};

export default JobDescriptionInput;
