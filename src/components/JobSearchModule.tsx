
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { toast } from "sonner";
import SearchForm from "./job-search/SearchForm";
import ProviderToggle from "./job-search/ProviderToggle";
import JobResultsList from "./job-search/JobResultsList";
import ExternalSearchButton from "./job-search/ExternalSearchButton";
import { SearchProvider, SearchResult } from "./job-search/types";

interface JobSearchModuleProps {
  query: string;
}

const JobSearchModule: React.FC<JobSearchModuleProps> = ({ query }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchProvider, setSearchProvider] = useState<SearchProvider>("google");

  useEffect(() => {
    if (query && !searchTerm) {
      setSearchTerm(query.split(" AND ")[0]?.replace(/[()]/g, "") || "");
    }
  }, [query, searchTerm]);

  const handleSearch = async () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }

    const searchQuery = searchTerm || query;
    setIsSearching(true);

    try {
      const response = await fetch(`https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(searchQuery)}&api_key=mock_api_key`);
      
      if (!response.ok) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const terms = searchQuery.split(/\s+AND\s+|\s+OR\s+/).map(term => term.replace(/[()]/g, "").trim());
        const skills = terms.filter(term => term.length > 0).slice(0, 5);
        
        const mockResults: SearchResult[] = [
          {
            title: `Senior ${skills[0] || "Software"} Engineer`,
            company: "TechCorp Inc.",
            location: "Remote / San Francisco",
            date: "Posted 3 days ago",
            url: "https://example.com/job1",
            snippet: `Looking for an experienced developer with skills in ${skills.slice(0, 3).join(", ") || "web technologies"}. Must have 3+ years of experience.`
          },
          {
            title: `${skills[1] || "Full Stack"} Developer`,
            company: "InnovateSoft",
            location: "New York / Remote",
            date: "Posted 1 week ago",
            url: "https://example.com/job2",
            snippet: `Seeking a talented programmer with experience in ${skills.slice(1, 4).join(", ") || "web development"}. Join our growing team!`
          },
          {
            title: `${skills[0] || "Software"} Architect`,
            company: "BuildSystems Ltd",
            location: "Austin, TX",
            date: "Posted today",
            url: "https://example.com/job3",
            snippet: `Join our team to build scalable solutions using ${skills.slice(2, 5).join(", ") || "modern technologies"}. Competitive salary and benefits.`
          }
        ];
        
        setResults(mockResults);
        toast.success("Search completed");
      } else {
        const data = await response.json();
        const jobListings = data.jobs_results || [];
        
        const formattedResults = jobListings.map((job: any) => ({
          title: job.title,
          company: job.company_name,
          location: job.location,
          url: job.link,
          date: job.detected_extensions?.posted_at || "Recently posted",
          snippet: job.snippet
        }));
        
        setResults(formattedResults);
        toast.success(`Found ${formattedResults.length} job listings`);
      }
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
