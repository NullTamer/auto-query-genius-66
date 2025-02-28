
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
  isProcessing?: boolean;
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  value,
  onChange,
  onSubmit,
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
      } else if (fileExtension === 'pdf') {
        // For PDF files, use a fallback method with FileReader
        // This is a simpler approach that might work where PDF.js fails
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            // Try to load PDF.js dynamically only when needed
            const pdfjsLib = await import('pdfjs-dist');
            
            // Set the worker source
            pdfjsLib.GlobalWorkerOptions.workerSrc = 
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            const arrayBuffer = e.target?.result as ArrayBuffer;
            console.log("PDF arrayBuffer size:", arrayBuffer.byteLength);
            
            // Load the PDF document
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            console.log("PDF loading task created");
            
            try {
              const pdf = await loadingTask.promise;
              console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
              
              let fullText = '';
              
              // Extract text from each page
              for (let i = 1; i <= pdf.numPages; i++) {
                console.log(`Processing page ${i}/${pdf.numPages}`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Extract text from text items
                const pageText = textContent.items
                  .filter((item: any) => 'str' in item)
                  .map((item: any) => item.str)
                  .join(' ');
                  
                fullText += pageText + '\n';
              }
              
              console.log(`Extracted ${fullText.length} characters of text from PDF`);
              
              if (fullText.trim() === '') {
                // If no text was extracted, try an alternative approach or show a message
                toast.warning("No text could be extracted from this PDF. It may be scanned or image-based.");
                // Optionally, you could try OCR here or suggest the user to manually copy-paste
              } else {
                onChange(fullText);
                toast.success("PDF file processed successfully");
              }
            } catch (pdfError) {
              console.error("PDF.js processing error:", pdfError);
              // Fallback to plain text extraction if PDF.js fails
              reader.readAsText(file);
              toast.warning("Using fallback method for PDF processing");
            }
          } catch (importError) {
            console.error("Failed to load PDF.js:", importError);
            // If PDF.js import fails, try to read as text anyway
            reader.readAsText(file);
            toast.warning("Using simple text extraction for PDF");
          }
        };
        
        reader.onerror = () => {
          toast.error("Error reading the PDF file");
        };
        
        // Start reading the file as an ArrayBuffer
        reader.readAsArrayBuffer(file);
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
          disabled={!value.trim() || isProcessing}
        >
          Generate Boolean Query
        </Button>
      </div>
    </Card>
  );
};

export default JobDescriptionInput;
