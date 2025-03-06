
import React from "react";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import JobResultsList from "./JobResultsList";
import SearchSection from "./SearchSection";
import TermSelector from "./TermSelector";
import { SearchResult } from "./types";
import { Keyword } from "@/hooks/useKeywords";
import { useLocation } from "react-router-dom";

interface JobSearchContentProps {
  query: string;
  keywords: Keyword[];
  searchTerm: string;
  selectedTerms: string[];
  isSearching: boolean;
  results: SearchResult[];
  onSearchTermChange: (value: string) => void;
  onTermToggle: (term: string) => void;
  onSelectCombination: (terms: string[]) => void;
  onSearch: () => void;
}

const JobSearchContent: React.FC<JobSearchContentProps> = ({
  query,
  keywords,
  searchTerm,
  selectedTerms,
  isSearching,
  results,
  onSearchTermChange,
  onTermToggle,
  onSelectCombination,
  onSearch
}) => {
  const location = useLocation();
  const isSearchPage = location.pathname === "/search";

  return (
    <Card className="cyber-card p-4 md:p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
          <Search className="inline mr-2 h-5 w-5" />
          Job Search
        </h2>
      </div>
      
      <div className="space-y-6">
        <TermSelector 
          query={query}
          selectedTerms={selectedTerms}
          keywords={keywords}
          onTermToggle={onTermToggle}
          onSelectCombination={onSelectCombination}
          isSearchPage={isSearchPage}
        />
        
        <SearchSection 
          searchTerm={searchTerm}
          isSearching={isSearching}
          query={query}
          onSearchTermChange={onSearchTermChange}
          onSearch={onSearch}
          isSearchPage={isSearchPage}
        />
        
        <Separator className="my-4" />
        
        <JobResultsList
          results={results}
          isSearching={isSearching}
        />
      </div>
    </Card>
  );
};

export default JobSearchContent;
