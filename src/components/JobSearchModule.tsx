
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SearchForm from "./job-search/SearchForm";
import ProviderToggle from "./job-search/ProviderToggle";
import JobResultsList from "./job-search/JobResultsList";
import ExternalSearchButton from "./job-search/ExternalSearchButton";
import QueryTermSelector from "./job-search/QueryTermSelector";
import JobBoardSelector from "./job-search/JobBoardSelector";
import { JobBoardSelection, SearchProvider, SearchResult } from "./job-search/types";
import { supabase } from "@/integrations/supabase/client";
import { Keyword } from "@/hooks/useKeywords";
import RecommendedSearchModule from "./recommended-search/RecommendedSearchModule";
import { useLocation, useNavigate } from "react-router-dom";

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
  const [selectedBoards, setSelectedBoards] = useState<JobBoardSelection>({
    linkedin: false,
    indeed: false,
    google: true,
    arbeitnow: false,
    jobdataapi: false
  });
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
      
      if (urlProvider && ["google", "linkedin", "indeed", "arbeitnow", "jobdataapi"].includes(urlProvider)) {
        setSearchProvider(urlProvider);
        
        // Update selected boards based on provider
        setSelectedBoards(prev => ({
          ...Object.keys(prev).reduce((acc, key) => ({
            ...acc,
            [key]: key === urlProvider
          }), {} as JobBoardSelection)
        }));
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
    
    // Update selected boards to match the provider
    setSelectedBoards(prev => ({
      ...prev,
      linkedin: provider === "linkedin",
      indeed: provider === "indeed",
      google: provider === "google",
      arbeitnow: provider === "arbeitnow",
      jobdataapi: provider === "jobdataapi"
    }));
    
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

  // Handle board selection change
  const handleBoardSelectionChange = (boards: JobBoardSelection) => {
    setSelectedBoards(boards);
    
    // Count selected boards
    const selectedCount = Object.values(boards).filter(Boolean).length;
    
    if (selectedCount === 0) {
      // If no boards selected, default to Google
      setSelectedBoards(prev => ({...prev, google: true}));
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
      
      // Determine whether to search on multiple boards or just one
      const multipleBoards = Object.values(selectedBoards).filter(Boolean).length > 1;
      
      // Create the body for the fetch request
      const requestBody: any = { 
        searchTerm: finalSearchTerm
      };
      
      // If searching on a single provider, specify which one
      if (!multipleBoards) {
        requestBody.provider = finalProvider;
      } else {
        // If searching on multiple boards, send the selected boards
        requestBody.providers = Object.entries(selectedBoards)
          .filter(([_, selected]) => selected)
          .map(([provider]) => provider);
          
        console.log(`Searching on multiple providers: ${requestBody.providers.join(', ')}`);
      }
      
      // Call the edge function to get job listings
      const response = await supabase.functions.invoke('fetch-job-listings', {
        body: requestBody
      });
      
      if (!response.error && response.data.success) {
        setResults(response.data.results);
        
        // Save to search history if we're logged in
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await supabase.from('search_history').insert({
              user_id: session.user.id,
              query: finalSearchTerm,
              provider: multipleBoards ? 'multiple' : finalProvider,
              results_count: response.data.results.length,
              real_results_count: response.data.results.length
            });
          }
        } catch (historyError) {
          console.error("Failed to save search history:", historyError);
        }
        
        // Show success toast
        toast.success(`Found ${response.data.results.length} job listings`);
      } else {
        const error = response.error || (response.data && !response.data.success ? response.data.error : "Unknown error");
        console.error("Edge function error:", error);
        throw new Error("Failed to fetch job listings");
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
              selectedBoards={selectedBoards}
            />
          </div>
          
          <ProviderToggle
            searchProvider={searchProvider}
            onProviderChange={handleProviderChange}
          />
          
          <JobBoardSelector
            selectedBoards={selectedBoards}
            onBoardSelectionChange={handleBoardSelectionChange}
            currentProvider={searchProvider}
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
