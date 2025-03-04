
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SearchForm from "./job-search/SearchForm";
import ProviderToggle from "./job-search/ProviderToggle";
import JobResultsList from "./job-search/JobResultsList";
import ExternalSearchButton from "./job-search/ExternalSearchButton";
import { SearchProvider, SearchResult } from "./job-search/types";
import { supabase } from "@/integrations/supabase/client";

interface JobSearchModuleProps {
  query: string;
}

const JobSearchModule: React.FC<JobSearchModuleProps> = ({ query }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchProvider, setSearchProvider] = useState<SearchProvider>("google");

  // Improve autopopulation to use more of the boolean query
  useEffect(() => {
    if (query && !searchTerm) {
      // Extract meaningful keywords from the query
      // Remove parentheses and operators, and take the first 3-4 terms
      const cleanedQuery = query.replace(/[()]/g, "")
                              .replace(/ AND | OR /g, " ")
                              .split(" ")
                              .filter(term => term.length > 0)
                              .slice(0, 4)
                              .join(" ");
      setSearchTerm(cleanedQuery);
    }
  }, [query, searchTerm]);

  const handleSearch = async () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }

    const searchQuery = searchTerm || query;
    setIsSearching(true);
    setResults([]);

    try {
      console.log(`Searching for "${searchQuery}" on ${searchProvider}`);
      
      // Call the edge function to get job listings
      const { data, error } = await supabase.functions.invoke('fetch-job-listings', {
        body: { 
          searchTerm: searchQuery,
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
    <Card className="cyber-card p-4 md:p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
          <Search className="inline mr-2 h-5 w-5" />
          Job Search
        </h2>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-grow">
            <SearchForm
              searchTerm={searchTerm}
              isSearching={isSearching}
              onSearchTermChange={setSearchTerm}
              onSearch={handleSearch}
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
  );
};

export default JobSearchModule;
