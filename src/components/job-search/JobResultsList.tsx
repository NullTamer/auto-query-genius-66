
import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Loader2, MapPin, Calendar, Building, CheckCircle, DollarSign, Briefcase, Bookmark, BookmarkCheck } from "lucide-react";
import { SearchResult } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveJobPosting } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface JobResultsListProps {
  results: SearchResult[];
  isSearching: boolean;
}

const JobResultsList: React.FC<JobResultsListProps> = ({ results, isSearching }) => {
  const [savedJobs, setSavedJobs] = useState<Record<number, boolean>>({});
  const [savingJobs, setSavingJobs] = useState<Record<number, boolean>>({});
  const navigate = useNavigate();

  const handleSaveJob = async (result: SearchResult, index: number) => {
    try {
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please sign in to save jobs", {
          description: "You'll be redirected to the login page."
        });
        setTimeout(() => navigate("/auth"), 2000);
        return;
      }
      
      // Set saving state for this job
      setSavingJobs(prev => ({ ...prev, [index]: true }));
      
      await saveJobPosting({
        title: result.title,
        company: result.company,
        url: result.url,
        snippet: result.snippet,
        location: result.location,
        source: result.source,
        salary: result.salary,
        jobType: result.jobType,
        date: result.date
      });
      
      // Update saved state
      setSavedJobs(prev => ({ ...prev, [index]: true }));
      
      toast.success("Job saved successfully", {
        description: "You can view your saved jobs in your profile."
      });
    } catch (error) {
      console.error("Error saving job:", error);
      toast.error("Failed to save job", { 
        description: error instanceof Error ? error.message : "Please try again later."
      });
    } finally {
      setSavingJobs(prev => ({ ...prev, [index]: false }));
    }
  };

  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center p-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Searching for job listings...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>Select query terms above and click "Search" to find matching jobs.</p>
        <p className="mt-2 text-sm">Or click "External" to search on job boards directly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <div className="flex items-center gap-2">
          <span>Found {results.length} job listings</span>
        </div>
      </div>
      
      <ScrollArea className="h-[400px] w-full">
        <div className="space-y-4 p-1">
          {results.map((result, index) => {
            const isSaved = savedJobs[index];
            const isSaving = savingJobs[index];
            
            return (
              <div
                key={index}
                className="p-4 border rounded-md bg-background/50 transition-all border-green-500/30 hover:border-green-500/50"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-primary">{result.title}</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                      onClick={() => handleSaveJob(result, index)}
                      disabled={isSaving || isSaved}
                      title={isSaved ? "Job saved" : "Save job"}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSaved ? (
                        <BookmarkCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-foreground hover:bg-primary/80 p-1 rounded transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-base font-medium mt-1">
                    <Building size={14} className="mr-1" />
                    <span>{result.company}</span>
                  </div>
                  
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                    <CheckCircle size={12} className="mr-1" />
                    {result.source}
                  </Badge>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground mt-1 flex-wrap gap-3">
                  {result.location && (
                    <div className="flex items-center">
                      <MapPin size={14} className="mr-1" />
                      <span>{result.location}</span>
                    </div>
                  )}
                  {result.date && (
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1" />
                      <span>{result.date}</span>
                    </div>
                  )}
                  {result.salary && (
                    <div className="flex items-center">
                      <DollarSign size={14} className="mr-1" />
                      <span>{result.salary}</span>
                    </div>
                  )}
                  {result.jobType && (
                    <div className="flex items-center">
                      <Briefcase size={14} className="mr-1" />
                      <span>{result.jobType}</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm line-clamp-3">{result.snippet}</p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default JobResultsList;
