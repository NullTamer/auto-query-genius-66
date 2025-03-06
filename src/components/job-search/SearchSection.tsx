
import React from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import SearchForm from "./SearchForm";
import ProviderToggle from "./ProviderToggle";
import JobBoardSelector from "./JobBoardSelector";
import ExternalSearchButton from "./ExternalSearchButton";
import { useSearchProvider } from "./SearchProvider";

interface SearchSectionProps {
  searchTerm: string;
  isSearching: boolean;
  query: string;
  onSearchTermChange: (value: string) => void;
  onSearch: () => void;
  isSearchPage: boolean;
}

const SearchSection: React.FC<SearchSectionProps> = ({
  searchTerm,
  isSearching,
  query,
  onSearchTermChange,
  onSearch,
  isSearchPage
}) => {
  const { searchProvider, selectedBoards, handleProviderChange, handleBoardSelectionChange } = useSearchProvider();

  return (
    <div className="grid grid-cols-1 gap-4">
      <SearchForm
        searchTerm={searchTerm}
        isSearching={isSearching}
        onSearchTermChange={onSearchTermChange}
        onSearch={onSearch}
        navigateToSearch={!isSearchPage}
        searchProvider={searchProvider}
      />
      
      <ProviderToggle
        searchProvider={searchProvider}
        onProviderChange={handleProviderChange}
      />
      
      <Separator className="my-4" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-md font-medium mb-3">Search Options</h3>
          <JobBoardSelector
            selectedBoards={selectedBoards}
            onBoardSelectionChange={handleBoardSelectionChange}
            currentProvider={searchProvider}
            onProviderChange={handleProviderChange}
          />
        </div>
        
        <div>
          <h3 className="text-md font-medium mb-3">External Search</h3>
          <ExternalSearchButton
            searchTerm={searchTerm}
            query={query}
            searchProvider={searchProvider}
            selectedBoards={selectedBoards}
          />
        </div>
      </div>
    </div>
  );
};

export default SearchSection;
