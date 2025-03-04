
import React, { useEffect } from "react";
import { Card } from "@/components/ui/card";
import NavigationPane from "@/components/layout/NavigationPane";
import { Search as SearchIcon, History } from "lucide-react";
import JobSearchModule from "@/components/JobSearchModule";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchProvider } from "@/components/job-search/types";
import { Button } from "@/components/ui/button";

const Search = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get("q") || "";
  const provider = (searchParams.get("provider") as SearchProvider) || "google";

  // Ensure URL is updated if parameters change
  useEffect(() => {
    const currentParams = new URLSearchParams(location.search);
    let needsUpdate = false;

    if (!currentParams.has("q") && searchQuery) {
      currentParams.set("q", searchQuery);
      needsUpdate = true;
    }

    if (!currentParams.has("provider") && provider) {
      currentParams.set("provider", provider);
      needsUpdate = true;
    }

    if (needsUpdate) {
      navigate(`/search?${currentParams.toString()}`, { replace: true });
    }
  }, [searchQuery, provider, location.search, navigate]);

  const handleViewHistory = () => {
    navigate("/profile");
  };

  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <NavigationPane />
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 ml-16">
        <Card className="cyber-card p-4 md:p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
              <SearchIcon className="inline mr-2 h-5 w-5" />
              Search
            </h2>
            <Button 
              variant="outline"
              size="sm"
              className="cyber-card"
              onClick={handleViewHistory}
            >
              <History className="mr-2 h-4 w-4" />
              Search History
            </Button>
          </div>
          
          <p className="mb-6 text-muted-foreground">
            Find job listings based on the selected search terms or your own custom query.
          </p>
          
          {searchQuery ? (
            <JobSearchModule 
              query={searchQuery} 
              keywords={[]}
              initialProvider={provider}
            />
          ) : (
            <p className="text-center py-6 text-muted-foreground">
              Start a search from the home page or use the navigation to run a new search.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Search;
