
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import NavigationPane from "@/components/layout/NavigationPane";
import { FileBadge, Upload, FileText, CheckCircle, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Define types for our resume data
interface UserResume {
  id: number;
  user_id: string;
  filename: string;
  content: string;
  file_type: string;
  created_at: string;
}

const Resume = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [resumeContent, setResumeContent] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if there's a saved resume on page load
  useEffect(() => {
    const checkForSavedResume = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        try {
          const { data, error } = await supabase
            .from('user_resumes')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (data && !error) {
            setUploadSuccess(true);
            setFileName(data.filename);
            setResumeContent(data.content);
          }
        } catch (error) {
          console.error('Error checking for saved resume:', error);
        }
      }
    };
    
    checkForSavedResume();
  }, []);

  const handleUploadResume = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is a PDF
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    
    try {
      // Read the file content first using PDF.js
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          if (!arrayBuffer) {
            console.error("PDF arrayBuffer is undefined");
            toast.error("Failed to read PDF file");
            setUploading(false);
            return;
          }
          
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          let fullText = '';
          
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => 'str' in item ? item.str : '').join(' ') + ' ';
          }
          
          // Store the text content
          const extractedText = fullText.trim();
          setResumeContent(extractedText);
          
          // Create form data for the file upload to save in the database
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            const { data, error } = await supabase
              .from('user_resumes')
              .insert({
                user_id: session.user.id,
                filename: file.name,
                content: extractedText,
                file_type: 'pdf'
              })
              .select()
              .single();
            
            if (error) {
              console.error('Error saving resume:', error);
              toast.error('Failed to save resume');
              setUploading(false);
              return;
            }
          }
          
          // Set success state
          setUploadSuccess(true);
          setFileName(file.name);
          toast.success(`Resume "${file.name}" uploaded and processed successfully`);
          setUploading(false);
        } catch (pdfError) {
          console.error('PDF.js processing error:', pdfError);
          toast.error('Failed to process PDF file');
          setUploading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error in PDF upload:', error);
      toast.error('An unexpected error occurred');
      setUploading(false);
    } finally {
      // Reset the file input to allow uploading the same file again
      event.target.value = '';
    }
  };

  const handleUploadClick = () => {
    document.getElementById('resume-upload')?.click();
  };
  
  const handleUseForQuery = () => {
    if (resumeContent) {
      // Navigate to the main page with the resume content
      navigate('/', { state: { resumeContent } });
    } else {
      toast.error('No resume content available');
    }
  };

  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <NavigationPane />
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 ml-16">
        <Card className="cyber-card p-4 md:p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
              <FileBadge className="inline mr-2 h-5 w-5" />
              Resume Builder
            </h2>
            <Button 
              variant="outline" 
              size="sm" 
              className="cyber-card flex items-center gap-2"
              onClick={() => navigate('/')}
            >
              <Home size={16} />
              Home
            </Button>
          </div>
          
          <p className="mb-6 text-muted-foreground">
            Upload your resume to match with job descriptions or build a new one based on your skills.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 border border-primary/20 hover:border-primary/50 transition-all cursor-pointer">
              <div className="flex flex-col items-center text-center">
                {uploadSuccess ? (
                  <CheckCircle className="h-10 w-10 mb-4 text-green-500" />
                ) : (
                  <Upload className="h-10 w-10 mb-4 text-primary" />
                )}
                <h3 className="text-lg font-medium mb-2">Upload Resume</h3>
                {fileName && uploadSuccess ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      Uploaded: {fileName}
                    </p>
                    <Button 
                      className="cyber-card flex items-center gap-2 w-full"
                      onClick={handleUseForQuery}
                    >
                      Use for Boolean Query <ArrowRight size={16} />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your existing resume to analyze how it matches with job listings.
                  </p>
                )}
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleUploadResume}
                />
                <Button 
                  className="cyber-card mt-4"
                  onClick={handleUploadClick}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload PDF"}
                </Button>
              </div>
            </Card>
            
            <Card className="p-6 border border-primary/20 hover:border-primary/50 transition-all cursor-pointer">
              <div className="flex flex-col items-center text-center">
                <FileText className="h-10 w-10 mb-4 text-primary" />
                <h3 className="text-lg font-medium mb-2">Build Resume</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a new resume based on your skills and experience.
                </p>
                <Button 
                  className="cyber-card" 
                  onClick={() => navigate('/profile/resumes')}
                >
                  Manage Resumes
                </Button>
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Resume;
