
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SearchForm from "./job-search/SearchForm";
import ProviderToggle from "./job-search/ProviderToggle";
import JobResultsList from "./job-search/JobResultsList";
import ExternalSearchButton from "./job-search/ExternalSearchButton";
import QueryTermSelector from "./job-search/QueryTermSelector";
import { SearchProvider, SearchResult } from "./job-search/types";
import { supabase } from "@/integrations/supabase/client";
import { Keyword } from "@/hooks/useKeywords";
import RecommendedSearchModule from "./recommended-search/RecommendedSearchModule";
import { useLocation } from "react-router-dom";

interface JobSearchModuleProps {
  query: string;
  keywords: Keyword[];
}

const JobSearchModule: React.FC<JobSearchModuleProps> = ({ query, keywords }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchProvider, setSearchProvider] = useState<SearchProvider>("google");
  const location = useLocation();
  const isSearchPage = location.pathname === "/search";

  // If we're on the search page, get query and provider from URL
  useEffect(() => {
    if (isSearchPage) {
      const searchParams = new URLSearchParams(location.search);
      const urlQuery = searchParams.get("q");
      const urlProvider = searchParams.get("provider") as SearchProvider | null;
      
      if (urlQuery) {
        setSearchTerm(urlQuery);
      }
      
      if (urlProvider && (urlProvider === "google" || urlProvider === "linkedin" || urlProvider === "indeed")) {
        setSearchProvider(urlProvider);
      }
      
      // Auto-search when navigating to search page with a query
      if (urlQuery) {
        handleSearch(urlQuery);
      }
    }
  }, [isSearchPage, location.search]);

  // Update search term when selected terms change
  useEffect(() => {
    setSearchTerm(selectedTerms.join(" "));
  }, [selectedTerms]);

  // Handle term selection/deselection
  const handleTermToggle = (term: string) => {
    setSelectedTerms(prev => 
      prev.includes(term)
        ? prev.filter(t => t !== term)
        : [...prev, term]
    );
  };

  // Handle selecting a recommended combination
  const handleSelectCombination = (terms: string[]) => {
    setSelectedTerms(terms);
    toast.success(`Applied search combination with ${terms.length} terms`);
  };

  const handleSearch = async (termOverride?: string) => {
    const finalSearchTerm = termOverride || searchTerm || query;
    
    if (!finalSearchTerm && selectedTerms.length === 0) {
      toast.error("Please select at least one search term");
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      console.log(`Searching for "${finalSearchTerm}" on ${searchProvider}`);
      
      // Call the edge function to get job listings with the correct param name
      const { data, error } = await supabase.functions.invoke('fetch-job-listings', {
        body: { 
          searchTerm: finalSearchTerm,
          provider: searchProvider
        }
      });
      
      if (error) {
        console.error("Edge function error:", error);
        throw new Error("Failed to fetch job listings");
      }
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch job listings");
      }
      
      setResults(data.results);
      toast.success(`Found ${data.results.length} job listings on ${searchProvider}`);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search for jobs");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {keywords.length > 0 && !isSearchPage && (
        <RecommendedSearchModule 
          keywords={keywords}
          onSelectCombination={handleSelectCombination}
        />
      )}
    
      <Card className="cyber-card p-4 md:p-6 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
            <Search className="inline mr-2 h-5 w-5" />
            Job Search
          </h2>
        </div>
        
        <div className="space-y-4">
          {!isSearchPage && (
            <QueryTermSelector 
              query={query}
              selectedTerms={selectedTerms}
              onTermToggle={handleTermToggle}
            />
          )}
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-grow">
              <SearchForm
                searchTerm={searchTerm}
                isSearching={isSearching}
                onSearchTermChange={setSearchTerm}
                onSearch={() => handleSearch()}
                navigateToSearch={!isSearchPage}
                searchProvider={searchProvider}
              />
            </div>
            <ExternalSearchButton
              searchTerm={searchTerm}
              query={query}
              searchProvider={searchProvider}
            />
          </div>
          
          <ProviderToggle
            searchProvider={searchProvider}
            onProviderChange={setSearchProvider}
          />
          
          <JobResultsList
            results={results}
            isSearching={isSearching}
          />
        </div>
      </Card>
    </div>
  );
};

export default JobSearchModule;
