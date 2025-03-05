
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Loader2, MapPin, Calendar, Building, AlertCircle, CheckCircle } from "lucide-react";
import { SearchResult } from "./types";
import { Badge } from "@/components/ui/badge";

interface JobResultsListProps {
  results: SearchResult[];
  isSearching: boolean;
}

const JobResultsList: React.FC<JobResultsListProps> = ({ results, isSearching }) => {
  // Count real vs fallback results
  const realResults = results.filter(r => !r.source.includes('Alternative') && r.source !== 'Fallback');
  const fallbackResults = results.filter(r => r.source.includes('Alternative') || r.source === 'Fallback');
  
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
    <div className="space-y-4">
      {realResults.length > 0 && fallbackResults.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
          <div className="flex items-center gap-2">
            <span>Found {realResults.length} real listings and {fallbackResults.length} generated listings</span>
          </div>
        </div>
      )}
      
      <ScrollArea className="h-[400px] w-full">
        <div className="space-y-4 p-1">
          {results.map((result, index) => {
            const isFallback = result.source.includes('Alternative') || result.source === 'Fallback';
            
            return (
              <div
                key={index}
                className={`p-4 border rounded-md bg-background/50 transition-all ${
                  isFallback 
                    ? 'border-yellow-500/30 hover:border-yellow-500/50' 
                    : 'border-green-500/30 hover:border-green-500/50'
                }`}
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
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-base font-medium mt-1">
                    <Building size={14} className="mr-1" />
                    <span>{result.company}</span>
                  </div>
                  
                  {isFallback && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-xs">
                      <AlertCircle size={12} className="mr-1" />
                      AI Generated
                    </Badge>
                  )}
                  
                  {!isFallback && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                      <CheckCircle size={12} className="mr-1" />
                      {result.source}
                    </Badge>
                  )}
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
                <p className="mt-2 text-sm line-clamp-3">{result.snippet}</p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default JobResultsList;
