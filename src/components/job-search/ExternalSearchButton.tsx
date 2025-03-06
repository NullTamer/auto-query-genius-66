
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
      case "arbeitnow":
        return `https://www.arbeitnow.com/jobs/${searchQuery}`;
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
    
    // Use an array for better handling of multiple windows
    const providers: SearchProvider[] = ["google", "linkedin", "indeed", "arbeitnow"];
    
    try {
      // Open each provider in a new window with proper delays
      providers.forEach((provider, index) => {
        setTimeout(() => {
          const url = getSearchUrl(provider);
          console.log(`Opening ${provider} search at: ${url}`);
          window.open(url, `_blank_${provider}`);
        }, index * 300); // 300ms delay between each window open
      });
      
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
