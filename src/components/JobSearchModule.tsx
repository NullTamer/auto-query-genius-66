import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ExternalLink, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SearchHistorySidebar from "@/components/SearchHistorySidebar";

interface JobSearchModuleProps {
  query: string;
  session: any;
}

interface SearchResult {
  title: string;
  company: string;
  url: string;
  snippet: string;
}

const JobSearchModule: React.FC<JobSearchModuleProps> = ({ query, session }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchProvider, setSearchProvider] = useState<"linkedin" | "indeed" | "google">("google");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    if (query) {
      setSearchTerm(query);
    }
  }, [query]);

  const saveSearchHistory = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    try {
      const { error } = await supabase
        .from('search_history')
        .insert({
          query: searchQuery,
          user_id: session?.user?.id || null
        });
        
      if (error) {
        console.error("Error saving search history:", error);
      }
    } catch (err) {
      console.error("Failed to save search history:", err);
    }
  };

  const handleSearch = async () => {
    const queryToUse = searchTerm || query;
    
    if (!queryToUse) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }

    setIsSearching(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const queryParts = queryToUse.split(" OR ").map(part => part.replace(/[()]/g, "").trim());
      const queryKeywords = queryParts.flatMap(part => part.split(" AND ").map(k => k.trim()));
      const uniqueKeywords = Array.from(new Set(queryKeywords)).filter(k => k.length > 0);
      
      const mockResults: SearchResult[] = [
        {
          title: `Senior ${uniqueKeywords[0] || 'Software'} Engineer`,
          company: "TechCorp Inc.",
          url: "https://example.com/job1",
          snippet: `Looking for an experienced developer with ${uniqueKeywords.slice(0, 3).join(', ')} skills. 
                    This position offers competitive salary and benefits with opportunities for growth.`
        },
        {
          title: `${uniqueKeywords[1] || 'Full Stack'} Developer`,
          company: "InnovateSoft",
          url: "https://example.com/job2",
          snippet: `Seeking a talented programmer with experience in ${uniqueKeywords.slice(3, 6).join(', ') || 'web technologies'}. 
                    Remote work available with a collaborative team environment.`
        },
        {
          title: `${uniqueKeywords[2] || 'Software'} Architect`,
          company: "BuildSystems Ltd",
          url: "https://example.com/job3",
          snippet: `Join our team to build scalable solutions using ${uniqueKeywords.slice(0, 4).join(', ') || 'modern technologies'}. 
                    5+ years of experience required with leadership capabilities.`
        },
        {
          title: `Lead ${uniqueKeywords[0] || 'Software'} Developer`,
          company: "Quantum Technologies",
          url: "https://example.com/job4",
          snippet: `We're looking for a lead developer proficient in ${uniqueKeywords.slice(2, 5).join(', ') || 'software development'}. 
                    Position includes managing a small team and architecting solutions.`
        },
        {
          title: `${uniqueKeywords[1] || 'Senior'} Engineer`,
          company: "Future Systems",
          url: "https://example.com/job5",
          snippet: `Exciting opportunity for engineers skilled in ${uniqueKeywords.slice(1, 4).join(', ') || 'modern technologies'}. 
                    Join a fast-growing startup with competitive compensation.`
        }
      ];
      
      setResults(mockResults);
      toast.success("Search completed");
      
      if (session?.user) {
        saveSearchHistory(queryToUse);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search for jobs");
    } finally {
      setIsSearching(false);
    }
  };

  const getSearchUrl = (provider: string, searchQuery: string) => {
    const encodedQuery = encodeURIComponent(searchQuery);
    
    switch (provider) {
      case "linkedin":
        return `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;
      case "indeed":
        return `https://www.indeed.com/jobs?q=${encodedQuery}`;
      case "google":
      default:
        return `https://www.google.com/search?q=${encodedQuery}+jobs`;
    }
  };

  const openExternalSearch = () => {
    const queryToUse = searchTerm || query;
    
    if (!queryToUse) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    if (session?.user) {
      saveSearchHistory(queryToUse);
    }
    
    window.open(getSearchUrl("google", queryToUse), "_blank");
    window.open(getSearchUrl("linkedin", queryToUse), "_blank");
    window.open(getSearchUrl("indeed", queryToUse), "_blank");
    
    toast.success("Opened search results in Google, LinkedIn, and Indeed");
  };

  const handleSelectFromHistory = (historicQuery: string) => {
    setSearchTerm(historicQuery);
    setSidebarOpen(false);
  };

  return (
    <>
      <Card className="cyber-card p-4 md:p-6 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
            <Search className="inline mr-2 h-5 w-5" />
            Job Search
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="cyber-card flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            History
          </Button>
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
                title="Search on Google, LinkedIn, and Indeed"
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
          
          {results.length === 0 && !isSearching && (searchTerm || query) && (
            <div className="text-center p-6 text-muted-foreground">
              <p>No search results yet. Click "Search" to find matching jobs.</p>
              <p className="mt-2 text-sm">Or click "External" to search on job boards.</p>
            </div>
          )}
        </div>
      </Card>
      
      <SearchHistorySidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectQuery={handleSelectFromHistory}
        currentQuery={searchTerm || query}
      />
    </>
  );
};

export default JobSearchModule;
