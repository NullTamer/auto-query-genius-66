
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SearchProvider } from "./types";
import { toast } from "sonner";

interface SearchFormProps {
  searchTerm: string;
  isSearching: boolean;
  onSearchTermChange: (value: string) => void;
  onSearch: () => void;
  navigateToSearch?: boolean;
  searchProvider?: SearchProvider;
}

const SearchForm: React.FC<SearchFormProps> = ({
  searchTerm,
  isSearching,
  onSearchTermChange,
  onSearch,
  navigateToSearch = false,
  searchProvider = "google",
}) => {
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term or use generated query");
      return;
    }

    if (navigateToSearch && searchTerm) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}&provider=${searchProvider}`);
    } else {
      onSearch();
    }
  };

  const handleClear = () => {
    onSearchTermChange("");
  };

  return (
    <div className="flex w-full items-center space-x-2">
      <div className="relative flex-grow">
        <Input
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="Enter search term or use generated query"
          className="w-full py-5 pl-10 pr-12 bg-background/50 border-primary/20 text-base"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-destructive"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <Button
        onClick={handleSearch}
        className="cyber-card hover:neon-glow transition-all h-10 px-4"
        disabled={isSearching}
      >
        {isSearching ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Search
          </>
        )}
      </Button>
    </div>
  );
};

export default SearchForm;
