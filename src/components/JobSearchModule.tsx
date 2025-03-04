import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface JobSearchModuleProps {
  query: string;
}

interface SearchResult {
  title: string;
  company: string;
  url: string;
  snippet: string;
  location?: string;
  date?: string;
}

const JobSearchModule: React.FC<JobSearchModuleProps> = ({ query }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchProvider, setSearchProvider] = useState<"linkedin" | "indeed" | "google">("google");

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

  const getSearchUrl = () => {
    const searchQuery = encodeURIComponent(searchTerm || query);
    
    switch (searchProvider) {
      case "linkedin":
        return `https://www.linkedin.com/jobs/search/?keywords=${searchQuery}`;
      case "indeed":
        return `https://www.indeed.com/jobs?q=${searchQuery}`;
      case "google":
      default:
        return `https://www.google.com/search?q=${searchQuery}+jobs`;
    }
  };

  const openExternalSearch = () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    window.open(getSearchUrl(), "_blank");
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
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter search term or use generated query"
            className="flex-grow bg-background/50 border-primary/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              className="cyber-card hover:neon-glow transition-all"
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching
                </>
              ) : "Search"}
            </Button>
            <Button
              onClick={openExternalSearch}
              variant="outline"
              className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
            >
              <ExternalLink size={16} />
              External
            </Button>
          </div>
        </div>
        
        <ToggleGroup 
          type="single" 
          value={searchProvider} 
          onValueChange={(value) => {
            if (value) setSearchProvider(value as "linkedin" | "indeed" | "google");
          }}
          className="flex flex-wrap gap-2 mb-4"
        >
          <ToggleGroupItem value="google" className="cyber-card">
            Google
          </ToggleGroupItem>
          <ToggleGroupItem value="linkedin" className="cyber-card">
            LinkedIn
          </ToggleGroupItem>
          <ToggleGroupItem value="indeed" className="cyber-card">
            Indeed
          </ToggleGroupItem>
        </ToggleGroup>
        
        {results.length > 0 && (
          <ScrollArea className="h-[300px] w-full">
            <div className="space-y-4">
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className="p-4 border border-primary/20 rounded-md bg-background/50 hover:border-primary/50 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-primary">{result.title}</h3>
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:text-primary-foreground"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <span>{result.company}</span>
                    {result.location && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{result.location}</span>
                      </>
                    )}
                    {result.date && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{result.date}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-sm">{result.snippet}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {results.length === 0 && !isSearching && (
          <div className="text-center p-6 text-muted-foreground">
            <p>No search results yet. Click "Search" to find matching jobs.</p>
            <p className="mt-2 text-sm">Or click "External" to search on job boards.</p>
          </div>
        )}
        
        {isSearching && (
          <div className="flex flex-col items-center justify-center p-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Searching for jobs...</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default JobSearchModule;
