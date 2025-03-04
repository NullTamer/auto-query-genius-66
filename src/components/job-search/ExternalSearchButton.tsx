
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
  const getSearchUrl = () => {
    const searchQuery = encodeURIComponent(searchTerm || query);
    
    switch (searchProvider) {
      case "linkedin":
        return `https://www.linkedin.com/jobs/search/?keywords=${searchQuery}`;
      case "indeed":
        return `https://www.indeed.com/jobs?q=${searchQuery}`;
      case "google":
      default:
        return `https://www.google.com/search?q=${searchQuery}+jobs`;
    }
  };

  const openExternalSearch = () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    window.open(getSearchUrl(), "_blank");
  };

  return (
    <Button
      onClick={openExternalSearch}
      variant="outline"
      className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
    >
      <ExternalLink size={16} />
      External
    </Button>
  );
};

export default ExternalSearchButton;
