
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SearchProvider, SearchResult, JobBoardSelection } from "./types";

interface UseSearchProps {
  initialQuery: string;
  searchProvider: SearchProvider;
  selectedBoards: JobBoardSelection;
}

// Helper function to clean the query
const cleanQuery = (query: string): string => {
  return query
    .replace(/\(\s*|\s*\)/g, ' ') // Remove parentheses
    .replace(/\s+AND\s+/gi, ' ') // Replace AND with space
    .replace(/\s+OR\s+/gi, ' ') // Replace OR with space
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
};

export const useSearch = ({ initialQuery, searchProvider, selectedBoards }: UseSearchProps) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery ? cleanQuery(initialQuery) : "");
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const isSearchPage = location.pathname === "/search";

  // Update searchTerm when initialQuery changes, but clean it
  useEffect(() => {
    if (initialQuery) {
      setSearchTerm(cleanQuery(initialQuery));
    }
  }, [initialQuery]);

  useEffect(() => {
    if (isSearchPage) {
      const searchParams = new URLSearchParams(location.search);
      const urlQuery = searchParams.get("q");
      const urlProvider = searchParams.get("provider") as SearchProvider | null;
      
      if (urlQuery && urlQuery !== searchTerm) {
        setSearchTerm(urlQuery);
      }
      
      if (urlQuery && !results.length) {
        handleSearch(urlQuery, urlProvider || undefined);
      }
    }
  }, [isSearchPage, location.search]);

  useEffect(() => {
    if (selectedTerms.length > 0) {
      setSearchTerm(selectedTerms.join(" "));
    }
  }, [selectedTerms]);

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

  const handleTermToggle = (term: string) => {
    setSelectedTerms(prev => 
      prev.includes(term)
        ? prev.filter(t => t !== term)
        : [...prev, term]
    );
  };

  const handleSelectCombination = (terms: string[]) => {
    setSelectedTerms(terms);
    toast.success(`Applied search combination with ${terms.length} terms`);
  };

  const clearSearchTerm = () => {
    setSearchTerm("");
    setSelectedTerms([]);
  };

  const handleSearch = async (termOverride?: string, providerOverride?: SearchProvider) => {
    const finalSearchTerm = termOverride || searchTerm || initialQuery;
    const finalProvider = providerOverride || searchProvider;
    
    if (!finalSearchTerm && selectedTerms.length === 0) {
      toast.error("Please select at least one search term");
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      console.log(`Searching for "${finalSearchTerm}" on ${finalProvider}`);
      
      const multipleBoards = Object.values(selectedBoards).filter(Boolean).length > 1;
      
      const requestBody: any = { 
        searchTerm: finalSearchTerm
      };
      
      if (!multipleBoards) {
        requestBody.provider = finalProvider;
      } else {
        requestBody.providers = Object.entries(selectedBoards)
          .filter(([_, selected]) => selected)
          .map(([provider]) => provider);
          
        console.log(`Searching on multiple providers: ${requestBody.providers.join(', ')}`);
      }
      
      const response = await supabase.functions.invoke('fetch-job-listings', {
        body: requestBody
      });
      
      if (!response.error && response.data.success) {
        setResults(response.data.results);
        
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

  return {
    searchTerm,
    setSearchTerm,
    selectedTerms,
    setSelectedTerms,
    isSearching,
    results,
    handleTermToggle,
    handleSelectCombination,
    handleSearch,
    clearSearchTerm
  };
};
