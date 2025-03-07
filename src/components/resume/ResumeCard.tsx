
import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Trash2, Calendar } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { toast } from "sonner";

interface UserResume {
  id: number;
  filename: string;
  created_at: string;
  content: string;
}

interface ResumeCardProps {
  resume: UserResume;
  onDelete: (id: number) => void;
  onSelect: (resume: UserResume) => void;
}

const ResumeCard: React.FC<ResumeCardProps> = ({ resume, onDelete, onSelect }) => {
  const createdDate = new Date(resume.created_at);
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });
  
  const handleDownload = () => {
    // Create a blob with the resume content
    const blob = new Blob([resume.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = resume.filename.replace('.pdf', '.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSelectResume = () => {
    try {
      // Ensure content is not empty
      if (!resume.content || resume.content.trim() === '') {
        toast.error("This resume has no content to use");
        return;
      }
      
      // Pass the resume to the parent component
      onSelect(resume);
      toast.success("Resume selected successfully");
    } catch (error) {
      console.error("Error selecting resume:", error);
      toast.error("Failed to select resume");
    }
  };

  return (
    <Card className="p-4 border border-primary/20 hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <FileText className="h-8 w-8 text-primary mr-3" />
          <div>
            <h4 className="text-base font-medium text-primary">{resume.filename}</h4>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleDownload}
            title="Download content as text"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
            onClick={() => onDelete(resume.id)}
            title="Delete resume"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
        {resume.content.substring(0, 150)}...
      </p>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-3 w-full cyber-card"
        onClick={handleSelectResume}
      >
        Use This Resume
      </Button>
    </Card>
  );
};

export default ResumeCard;
