
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Loader2 } from "lucide-react";
import { SearchResult } from "./types";

interface JobResultsListProps {
  results: SearchResult[];
  isSearching: boolean;
}

const JobResultsList: React.FC<JobResultsListProps> = ({ results, isSearching }) => {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center p-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Searching for real job listings...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>No search results yet. Click "Search" to find matching jobs.</p>
        <p className="mt-2 text-sm">Or click "External" to search on job boards directly.</p>
      </div>
    );
  }

  return (
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
            <div className="flex items-center text-sm text-muted-foreground mt-1 flex-wrap">
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
  );
};

export default JobResultsList;
