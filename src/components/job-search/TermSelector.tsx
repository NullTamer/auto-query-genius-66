
import React from "react";
import QueryTermSelector from "./QueryTermSelector";
import { Keyword } from "@/hooks/useKeywords";
import RecommendedSearchModule from "../recommended-search/RecommendedSearchModule";

interface TermSelectorProps {
  query: string;
  selectedTerms: string[];
  keywords: Keyword[];
  onTermToggle: (term: string) => void;
  onSelectCombination: (terms: string[]) => void;
  isSearchPage: boolean;
}

const TermSelector: React.FC<TermSelectorProps> = ({
  query,
  selectedTerms,
  keywords,
  onTermToggle,
  onSelectCombination,
  isSearchPage
}) => {
  return (
    <>
      {keywords.length > 0 && !isSearchPage && (
        <RecommendedSearchModule 
          keywords={keywords}
          onSelectCombination={onSelectCombination}
        />
      )}
      
      {!isSearchPage && (
        <QueryTermSelector 
          query={query}
          selectedTerms={selectedTerms}
          onTermToggle={onTermToggle}
        />
      )}
    </>
  );
};

export default TermSelector;
