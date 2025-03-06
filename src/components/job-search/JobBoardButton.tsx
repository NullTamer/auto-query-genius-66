
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SearchProvider } from "./types";
import { getProviderDisplayName, getSearchUrl } from "./utils/searchUrlUtils";

interface JobBoardButtonProps {
  provider: string;
  searchTerm: string;
  currentProvider: SearchProvider;
  isDisabled?: boolean;
}

const JobBoardButton: React.FC<JobBoardButtonProps> = ({
  provider,
  searchTerm,
  currentProvider,
  isDisabled = false
}) => {
  const handleClick = () => {
    window.open(getSearchUrl(provider as SearchProvider, searchTerm), "_blank");
  };

  const displayName = getProviderDisplayName(provider);
  
  return (
    <Button
      onClick={handleClick}
      variant={provider === currentProvider ? "default" : "outline"}
      size="sm"
      disabled={isDisabled}
      className={cn(
        "cyber-card transition-all whitespace-nowrap",
        provider === currentProvider ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:neon-glow",
        isDisabled && "opacity-50"
      )}
      title={`Open in ${displayName}`}
    >
      {displayName}
    </Button>
  );
};

export default JobBoardButton;
