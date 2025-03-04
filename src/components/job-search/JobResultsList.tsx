
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Loader2, MapPin, Calendar, Building } from "lucide-react";
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
        <p className="mt-4 text-muted-foreground">Searching for job listings...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>Select query terms above and click "Search" to find matching jobs.</p>
        <p className="mt-2 text-sm">Or click "External" to search on job boards directly.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full">
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
                className="text-primary hover:text-primary-foreground hover:bg-primary/80 p-1 rounded transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={16} />
              </a>
            </div>
            <div className="flex items-center text-base font-medium mt-1">
              <Building size={14} className="mr-1" />
              <span>{result.company}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground mt-1 flex-wrap gap-3">
              {result.location && (
                <div className="flex items-center">
                  <MapPin size={14} className="mr-1" />
                  <span>{result.location}</span>
                </div>
              )}
              {result.date && (
                <div className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  <span>{result.date}</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-sm line-clamp-3">{result.snippet || result.description}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default JobResultsList;
