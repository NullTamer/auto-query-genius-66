
import React from "react";
import { Card } from "@/components/ui/card";
import NavigationPane from "@/components/layout/NavigationPane";
import { Search as SearchIcon } from "lucide-react";
import JobSearchModule from "@/components/JobSearchModule";
import { useLocation } from "react-router-dom";

const Search = () => {
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get("q") || "";

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
          </div>
          
          <p className="mb-6 text-muted-foreground">
            Find job listings based on the selected search terms or your own custom query.
          </p>
          
          {searchQuery ? (
            <JobSearchModule query={searchQuery} keywords={[]} />
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
