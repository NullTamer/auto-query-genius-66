
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, Home, AlertCircle } from "lucide-react";
import NavigationPane from "@/components/layout/NavigationPane";
import ResumeCard from "@/components/resume/ResumeCard";

interface UserResume {
  id: number;
  user_id: string;
  filename: string;
  content: string;
  file_type: string;
  created_at: string;
}

const ResumeManager = () => {
  const [resumes, setResumes] = useState<UserResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/auth');
          return;
        }
        
        const { data, error } = await supabase
          .from('user_resumes')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setResumes(data || []);
      } catch (error) {
        console.error("Error fetching resumes:", error);
        toast.error("Failed to load your resumes");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResumes();
  }, [navigate]);

  const handleDeleteResume = async (resumeId: number) => {
    try {
      const { error } = await supabase
        .from('user_resumes')
        .delete()
        .eq('id', resumeId);
        
      if (error) throw error;
      
      // Update the local state
      setResumes(resumes.filter(resume => resume.id !== resumeId));
      toast.success("Resume deleted successfully");
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast.error("Failed to delete resume");
    }
  };

  const handleSelectResume = (resume: UserResume) => {
    navigate('/', { state: { resumeContent: resume.content } });
  };

  const handleUploadNewClick = () => {
    navigate('/resume');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <NavigationPane />
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 ml-16">
        <Card className="cyber-card p-4 md:p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
              Manage Your Resumes
            </h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="cyber-card flex items-center gap-2"
                onClick={() => navigate('/')}
              >
                <Home size={16} />
                Home
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="cyber-card flex items-center gap-2"
                onClick={handleUploadNewClick}
              >
                <FilePlus size={16} />
                Upload New
              </Button>
            </div>
          </div>
          
          {resumes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.map(resume => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  onDelete={handleDeleteResume}
                  onSelect={handleSelectResume}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Resumes Found</h3>
              <p className="text-muted-foreground mb-6">
                You haven't uploaded any resumes yet. Upload a resume to get started.
              </p>
              <Button className="cyber-card" onClick={handleUploadNewClick}>
                <FilePlus className="mr-2 h-4 w-4" />
                Upload Your First Resume
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResumeManager;
