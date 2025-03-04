
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

interface SearchFormProps {
  searchTerm: string;
  isSearching: boolean;
  onSearchTermChange: (value: string) => void;
  onSearch: () => void;
}

const SearchForm: React.FC<SearchFormProps> = ({
  searchTerm,
  isSearching,
  onSearchTermChange,
  onSearch,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <Input
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        placeholder="Enter search term or use generated query"
        className="flex-grow bg-background/50 border-primary/20"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch();
          }
        }}
      />
      <Button
        onClick={onSearch}
        className="cyber-card hover:neon-glow transition-all whitespace-nowrap"
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
