
import React from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { JobBoardSelection, SearchProvider } from "./types";

interface ExternalSearchButtonProps {
  searchTerm: string;
  query: string;
  searchProvider: SearchProvider;
  selectedBoards?: JobBoardSelection;
}

const ExternalSearchButton: React.FC<ExternalSearchButtonProps> = ({
  searchTerm,
  query,
  searchProvider,
  selectedBoards,
}) => {
  const getSearchUrl = (provider: SearchProvider) => {
    const searchQuery = encodeURIComponent(searchTerm || query);
    
    switch (provider) {
      case "linkedin":
        return `https://www.linkedin.com/jobs/search/?keywords=${searchQuery}`;
      case "indeed":
        return `https://www.indeed.com/jobs?q=${searchQuery}`;
      case "google":
        return `https://www.google.com/search?q=${searchQuery}+jobs`;
      case "arbeitnow":
        return `https://www.arbeitnow.com/jobs/${searchQuery}`;
      case "jobdataapi":
        return `https://www.google.com/search?q=${searchQuery}+jobs`;
      case "usajobs":
        return `https://www.usajobs.gov/Search/Results?k=${searchQuery}`;
      case "remoteok":
        return `https://remoteok.com/remote-${searchQuery.replace(/\s+/g, '-')}-jobs`;
      case "glassdoor":
        return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${searchQuery}`;
      default:
        return `https://www.google.com/search?q=${searchQuery}+jobs`;
    }
  };

  const openExternalSearch = () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    // Open in the currently selected provider
    window.open(getSearchUrl(searchProvider), "_blank");
  };

  const openAllJobBoards = () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    // Determine which providers to open based on selectedBoards
    const providers: SearchProvider[] = [];
    
    if (selectedBoards) {
      // Use selected boards if available
      if (selectedBoards.google) providers.push("google");
      if (selectedBoards.linkedin) providers.push("linkedin");
      if (selectedBoards.indeed) providers.push("indeed");
      if (selectedBoards.arbeitnow) providers.push("arbeitnow");
      if (selectedBoards.jobdataapi) providers.push("jobdataapi");
      if (selectedBoards.usajobs) providers.push("usajobs");
      if (selectedBoards.remoteok) providers.push("remoteok");
      if (selectedBoards.glassdoor) providers.push("glassdoor");
    } else {
      // Default to all providers if no selection
      providers.push("google", "linkedin", "indeed", "arbeitnow", "jobdataapi", "usajobs", "remoteok", "glassdoor");
    }
    
    // If no boards are selected, show error
    if (providers.length === 0) {
      toast.error("Please select at least one job board");
      return;
    }
    
    try {
      // Open each provider in a new window with proper delays
      providers.forEach((provider, index) => {
        setTimeout(() => {
          const url = getSearchUrl(provider);
          console.log(`Opening ${provider} search at: ${url}`);
          window.open(url, `_blank_${provider}`);
        }, index * 300); // 300ms delay between each window open
      });
      
      toast.success(`Opened search in ${providers.length} job board${providers.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error("Failed to open job boards:", error);
      toast.error("Failed to open job boards. Please check your popup blocker settings.");
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={openExternalSearch}
        variant="outline"
        className="cyber-card flex items-center gap-2 hover:neon-glow transition-all whitespace-nowrap"
        title={`Open in ${searchProvider}`}
      >
        <ExternalLink size={16} />
        External
      </Button>
      <Button
        onClick={openAllJobBoards}
        variant="outline"
        className="cyber-card flex items-center gap-2 hover:neon-glow transition-all whitespace-nowrap"
        title="Open in selected job boards"
      >
        <ExternalLink size={16} />
        {selectedBoards ? "Selected Boards" : "All Boards"}
      </Button>
    </div>
  );
};

export default ExternalSearchButton;
