
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
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock results based on search query and provider
      const terms = searchQuery.split(/\s+AND\s+|\s+OR\s+/).map(term => term.replace(/[()]/g, "").trim());
      const skills = terms.filter(term => term.length > 0).slice(0, 5);
      
      // Create different mock results based on the selected provider
      let mockResults: SearchResult[] = [];
      
      switch(searchProvider) {
        case "linkedin":
          mockResults = [
            {
              title: `${skills[0] || "Senior"} Developer`,
              company: "LinkedIn Jobs Corp",
              location: "Remote / San Francisco",
              date: "Posted 2 days ago",
              url: "https://linkedin.com/jobs/example1",
              snippet: `LinkedIn: Looking for a developer with skills in ${skills.slice(0, 3).join(", ") || "web technologies"}. Must have 3+ years of experience.`
            },
            {
              title: `${skills[1] || "Full Stack"} Engineer`,
              company: "TechConnect",
              location: "New York / Remote",
              date: "Posted 5 days ago",
              url: "https://linkedin.com/jobs/example2",
              snippet: `LinkedIn: Join our team of talented developers with experience in ${skills.slice(1, 4).join(", ") || "software development"}.`
            },
            {
              title: `${skills[0] || "Software"} Specialist`,
              company: "ProTech Solutions",
              location: "Boston, MA",
              date: "Posted yesterday",
              url: "https://linkedin.com/jobs/example3",
              snippet: `LinkedIn: Exciting opportunity to work with ${skills.slice(2, 5).join(", ") || "cutting-edge technologies"} in a dynamic environment.`
            }
          ];
          break;
          
        case "indeed":
          mockResults = [
            {
              title: `${skills[0] || "Lead"} Programmer`,
              company: "Indeed Tech",
              location: "Chicago / Remote",
              date: "Posted 1 week ago",
              url: "https://indeed.com/jobs/example1",
              snippet: `Indeed: Seeking programmers with strong ${skills.slice(0, 3).join(", ") || "programming"} skills. Competitive salary.`
            },
            {
              title: `${skills[1] || "Backend"} Developer`,
              company: "Data Systems Inc",
              location: "Austin, TX",
              date: "Posted 3 days ago",
              url: "https://indeed.com/jobs/example2",
              snippet: `Indeed: Join our growing team working with ${skills.slice(1, 4).join(", ") || "server technologies"} and cloud services.`
            },
            {
              title: `${skills[0] || "Application"} Engineer`,
              company: "SoftwareFirst",
              location: "Seattle, WA",
              date: "Posted today",
              url: "https://indeed.com/jobs/example3",
              snippet: `Indeed: Help build innovative solutions using ${skills.slice(2, 5).join(", ") || "modern frameworks"} and methodologies.`
            }
          ];
          break;
          
        case "google":
        default:
          mockResults = [
            {
              title: `Senior ${skills[0] || "Software"} Engineer`,
              company: "TechCorp Inc.",
              location: "Remote / San Francisco",
              date: "Posted 3 days ago",
              url: "https://example.com/job1",
              snippet: `Google: Looking for an experienced developer with skills in ${skills.slice(0, 3).join(", ") || "web technologies"}. Must have 3+ years of experience.`
            },
            {
              title: `${skills[1] || "Full Stack"} Developer`,
              company: "InnovateSoft",
              location: "New York / Remote",
              date: "Posted 1 week ago",
              url: "https://example.com/job2",
              snippet: `Google: Seeking a talented programmer with experience in ${skills.slice(1, 4).join(", ") || "web development"}. Join our growing team!`
            },
            {
              title: `${skills[0] || "Software"} Architect`,
              company: "BuildSystems Ltd",
              location: "Austin, TX",
              date: "Posted today",
              url: "https://example.com/job3",
              snippet: `Google: Join our team to build scalable solutions using ${skills.slice(2, 5).join(", ") || "modern technologies"}. Competitive salary and benefits.`
            }
          ];
      }
      
      setResults(mockResults);
      toast.success(`Found ${mockResults.length} job listings on ${searchProvider}`);
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
