
import React from "react";
import { Keyword } from "@/hooks/useKeywords";
import { SearchProvider } from "./job-search/types";
import { SearchProviderProvider, useSearchProvider } from "./job-search/SearchProvider";
import { useSearch } from "./job-search/useSearch";
import JobSearchContent from "./job-search/JobSearchContent";

interface JobSearchModuleProps {
  query: string;
  keywords: Keyword[];
  initialProvider?: SearchProvider;
}

const JobSearchModule: React.FC<JobSearchModuleProps> = ({ 
  query, 
  keywords,
  initialProvider 
}) => {
  return (
    <div className="space-y-6">
      <SearchProviderProvider initialProvider={initialProvider}>
        <JobSearchModuleContent query={query} keywords={keywords} />
      </SearchProviderProvider>
    </div>
  );
};

// Inner component with access to the SearchProvider context
const JobSearchModuleContent: React.FC<{ query: string; keywords: Keyword[] }> = ({
  query,
  keywords
}) => {
  const { searchProvider, selectedBoards } = useSearchProvider();
  
  const {
    searchTerm,
    setSearchTerm,
    selectedTerms,
    isSearching,
    results,
    handleTermToggle,
    handleSelectCombination,
    handleSearch
  } = useSearch({
    initialQuery: query,
    searchProvider,
    selectedBoards
  });

  return (
    <JobSearchContent
      query={query}
      keywords={keywords}
      searchTerm={searchTerm}
      selectedTerms={selectedTerms}
      isSearching={isSearching}
      results={results}
      onSearchTermChange={setSearchTerm}
      onTermToggle={handleTermToggle}
      onSelectCombination={handleSelectCombination}
      onSearch={() => handleSearch()}
    />
  );
};

export default JobSearchModule;
