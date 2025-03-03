
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface JobSearchModuleProps {
  query: string;
}

interface SearchResult {
  title: string;
  company: string;
  url: string;
  snippet: string;
}

const JobSearchModule: React.FC<JobSearchModuleProps> = ({ query }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchProvider, setSearchProvider] = useState<"linkedin" | "indeed" | "google">("google");

  const handleSearch = async () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }

    setIsSearching(true);

    try {
      // For now, we'll just create some mock results
      // In a real implementation, this would call an API to search job boards
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockResults: SearchResult[] = [
        {
          title: "Senior Software Engineer",
          company: "TechCorp Inc.",
          url: "https://example.com/job1",
          snippet: "Looking for an experienced developer with skills in " + 
                   (searchTerm || query.split(" OR ")[0]?.replace(/[()]/g, ""))
        },
        {
          title: "Full Stack Developer",
          company: "InnovateSoft",
          url: "https://example.com/job2",
          snippet: "Seeking a talented programmer with experience in " + 
                   (searchTerm || query.split(" OR ")[1]?.replace(/[()]/g, "") || "web technologies")
        },
        {
          title: "Software Architect",
          company: "BuildSystems Ltd",
          url: "https://example.com/job3",
          snippet: "Join our team to build scalable solutions using " + 
                   (searchTerm || query.split(" OR ")[2]?.replace(/[()]/g, "") || "modern technologies")
        }
      ];
      
      setResults(mockResults);
      toast.success("Search completed");
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
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              className="cyber-card hover:neon-glow transition-all"
              disabled={isSearching}
            >
              {isSearching ? "Searching..." : "Search"}
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
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={searchProvider === "google" ? "default" : "outline"}
            onClick={() => setSearchProvider("google")}
            className="cyber-card"
          >
            Google
          </Button>
          <Button
            size="sm"
            variant={searchProvider === "linkedin" ? "default" : "outline"}
            onClick={() => setSearchProvider("linkedin")}
            className="cyber-card"
          >
            LinkedIn
          </Button>
          <Button
            size="sm"
            variant={searchProvider === "indeed" ? "default" : "outline"}
            onClick={() => setSearchProvider("indeed")}
            className="cyber-card"
          >
            Indeed
          </Button>
        </div>
        
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
                  <p className="text-sm text-muted-foreground">{result.company}</p>
                  <p className="mt-2 text-sm">{result.snippet}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {results.length === 0 && !isSearching && query && (
          <div className="text-center p-6 text-muted-foreground">
            <p>No search results yet. Click "Search" to find matching jobs.</p>
            <p className="mt-2 text-sm">Or click "External" to search on job boards.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default JobSearchModule;
