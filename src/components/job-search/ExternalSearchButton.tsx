
import React from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SearchProvider } from "./types";

interface ExternalSearchButtonProps {
  searchTerm: string;
  query: string;
  searchProvider: SearchProvider;
}

const ExternalSearchButton: React.FC<ExternalSearchButtonProps> = ({
  searchTerm,
  query,
  searchProvider,
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
    
    // Fixed: Open each provider in a new window to ensure all tabs open
    try {
      window.open(getSearchUrl("google"), "_blank");
      setTimeout(() => window.open(getSearchUrl("linkedin"), "_blank"), 300);
      setTimeout(() => window.open(getSearchUrl("indeed"), "_blank"), 600);
      
      toast.success("Opened search in all job boards");
    } catch (error) {
      console.error("Failed to open job boards:", error);
      toast.error("Failed to open all job boards. Please check your popup blocker settings.");
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
        title="Open in all job boards"
      >
        <ExternalLink size={16} />
        All Boards
      </Button>
    </div>
  );
};

export default ExternalSearchButton;
