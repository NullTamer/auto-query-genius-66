
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import NavigationPane from "@/components/layout/NavigationPane";
import { FileBadge, Upload, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Resume = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

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
      // Create form data for the file upload
      const formData = new FormData();
      formData.append('pdf', file);
      
      // Call the parse-pdf edge function
      const { data, error } = await supabase.functions.invoke('parse-pdf', {
        body: formData,
      });
      
      if (error) {
        console.error('Error uploading PDF:', error);
        toast.error('Failed to upload PDF. Please try again.');
        return;
      }
      
      if (!data.success) {
        toast.error(data.error || 'Failed to process PDF');
        return;
      }
      
      // Set success state
      setUploadSuccess(true);
      setFileName(file.name);
      toast.success(`Resume "${file.name}" uploaded successfully`);
      
    } catch (error) {
      console.error('Error in PDF upload:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setUploading(false);
      // Reset the file input to allow uploading the same file again
      event.target.value = '';
    }
  };

  const handleUploadClick = () => {
    document.getElementById('resume-upload')?.click();
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
                  <p className="text-sm text-muted-foreground mb-4">
                    Uploaded: {fileName}
                  </p>
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
                  className="cyber-card"
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
                <Button className="cyber-card">Create New</Button>
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Resume;
