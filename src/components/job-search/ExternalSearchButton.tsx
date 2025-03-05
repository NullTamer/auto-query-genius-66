
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
    
    // Open in all three providers
    window.open(getSearchUrl("google"), "_blank");
    window.open(getSearchUrl("linkedin"), "_blank");
    window.open(getSearchUrl("indeed"), "_blank");
    
    toast.success("Opened search in all job boards");
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
