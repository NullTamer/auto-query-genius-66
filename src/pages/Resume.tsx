
import React from "react";
import { Card } from "@/components/ui/card";
import NavigationPane from "@/components/layout/NavigationPane";
import { FileBadge, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const Resume = () => {
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
                <Upload className="h-10 w-10 mb-4 text-primary" />
                <h3 className="text-lg font-medium mb-2">Upload Resume</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your existing resume to analyze how it matches with job listings.
                </p>
                <Button className="cyber-card">Upload PDF</Button>
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
