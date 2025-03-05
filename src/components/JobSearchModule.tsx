
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Search, Loader2, Info } from "lucide-react";
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
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [searchTerm, setSearchTerm] = useState(query || "");
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchProvider, setSearchProvider] = useState<SearchProvider>(initialProvider || "google");
  const location = useLocation();
  const navigate = useNavigate();
  const isSearchPage = location.pathname === "/search";

  // Initialize searchTerm with query when component mounts or query changes
  useEffect(() => {
    if (query) {
      setSearchTerm(query);
    }
  }, [query]);

  // If we're on the search page, get query and provider from URL
  useEffect(() => {
    if (isSearchPage) {
      const searchParams = new URLSearchParams(location.search);
      const urlQuery = searchParams.get("q");
      const urlProvider = searchParams.get("provider") as SearchProvider | null;
      
      if (urlQuery && urlQuery !== searchTerm) {
        setSearchTerm(urlQuery);
      }
      
      if (urlProvider && (urlProvider === "google" || urlProvider === "linkedin" || urlProvider === "indeed")) {
        setSearchProvider(urlProvider);
      }
      
      // Auto-search when navigating to search page with a query
      if (urlQuery && !results.length) {
        handleSearch(urlQuery, urlProvider || undefined);
      }
    }
  }, [isSearchPage, location.search]);

  // Update search term when selected terms change
  useEffect(() => {
    if (selectedTerms.length > 0) {
      setSearchTerm(selectedTerms.join(" "));
    }
  }, [selectedTerms]);

  // Update search parameters in URL when provider or searchTerm changes on the search page
  useEffect(() => {
    if (isSearchPage && searchTerm) {
      const searchParams = new URLSearchParams(location.search);
      let needsUpdate = false;
      
      if (searchParams.get("q") !== searchTerm) {
        searchParams.set("q", searchTerm);
        needsUpdate = true;
      }
      
      if (searchParams.get("provider") !== searchProvider) {
        searchParams.set("provider", searchProvider);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        navigate(`/search?${searchParams.toString()}`, { replace: true });
      }
    }
  }, [searchProvider, searchTerm, isSearchPage, navigate, location.search]);

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

  // Handle provider change
  const handleProviderChange = (provider: SearchProvider) => {
    setSearchProvider(provider);
    
    // If we already have results and are on the search page, search again with new provider
    if (results.length > 0 && isSearchPage) {
      handleSearch(searchTerm, provider);
    }
    
    // Update URL to include provider
    if (isSearchPage) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set("provider", provider);
      navigate(`/search?${searchParams.toString()}`, { replace: true });
    }
  };

  const handleSearch = async (termOverride?: string, providerOverride?: SearchProvider) => {
    const finalSearchTerm = termOverride || searchTerm || query;
    const finalProvider = providerOverride || searchProvider;
    
    if (!finalSearchTerm && selectedTerms.length === 0) {
      toast.error("Please select at least one search term");
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      console.log(`Searching for "${finalSearchTerm}" on ${finalProvider}`);
      
      // Add retry logic to improve chances of getting real results
      let attempts = 0;
      const maxAttempts = 2;
      let successfulSearch = false;
      let data: any;
      
      while (attempts < maxAttempts && !successfulSearch) {
        attempts++;
        
        // Call the edge function to get job listings
        const response = await supabase.functions.invoke('fetch-job-listings', {
          body: { 
            searchTerm: finalSearchTerm,
            provider: finalProvider
          }
        });
        
        if (!response.error && response.data.success) {
          data = response.data;
          
          // Check if we got real results
          const realResultsCount = data.results.filter(
            (r: SearchResult) => !r.source.includes('Alternative') && r.source !== 'Fallback'
          ).length;
          
          if (realResultsCount > 0) {
            successfulSearch = true;
            console.log(`Got ${realResultsCount} real results on attempt ${attempts}`);
          } else if (attempts < maxAttempts) {
            console.log(`No real results on attempt ${attempts}, retrying...`);
            // Short delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          // If there's an error, don't retry
          const error = response.error || (response.data && !response.data.success ? response.data.error : "Unknown error");
          console.error("Edge function error:", error);
          throw new Error("Failed to fetch job listings");
        }
      }
      
      if (!data) {
        throw new Error("Failed to fetch job listings after multiple attempts");
      }
      
      // Count real vs. fallback results for better user feedback
      const realResults = data.results.filter(
        (r: SearchResult) => !r.source.includes('Alternative') && r.source !== 'Fallback'
      );
      const fallbackResults = data.results.filter(
        (r: SearchResult) => r.source.includes('Alternative') || r.source === 'Fallback'
      );
      
      setResults(data.results);
      
      // Save to search history if we're logged in
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('search_history').insert({
            user_id: session.user.id,
            query: finalSearchTerm,
            provider: finalProvider,
            results_count: data.results.length,
            real_results_count: realResults.length
          });
        }
      } catch (historyError) {
        console.error("Failed to save search history:", historyError);
      }
      
      // Show appropriate toast based on result types
      if (realResults.length > 0) {
        if (fallbackResults.length > 0) {
          toast.success(`Found ${realResults.length} real and ${fallbackResults.length} generated job listings`);
        } else {
          toast.success(`Found ${realResults.length} job listings on ${finalProvider}`);
        }
      } else {
        toast.info(`Generated ${fallbackResults.length} job listings based on your search`);
      }
      
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
          
          <Alert variant="default" className="bg-blue-500/10 text-blue-500 border border-blue-500/20 mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Results include both real job listings and AI-generated listings when real data can't be retrieved.
            </AlertDescription>
          </Alert>
          
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
            onProviderChange={handleProviderChange}
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
