
import React from "react";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

interface QueryTermSelectorProps {
  query: string;
  selectedTerms: string[];
  onTermToggle: (term: string) => void;
}

const QueryTermSelector: React.FC<QueryTermSelectorProps> = ({
  query,
  selectedTerms,
  onTermToggle,
}) => {
  // Parse the boolean query to extract terms
  const parseQueryTerms = (query: string): string[] => {
    if (!query) return [];
    
    // Remove parentheses and boolean operators
    const cleaned = query
      .replace(/\([^)]*\)/g, ' ') // Remove content inside parentheses
      .replace(/\(|\)/g, '') // Remove parentheses
      .replace(/ AND | OR /gi, ' '); // Remove boolean operators
    
    // Extract unique terms
    return Array.from(
      new Set(
        cleaned
          .split(/\s+/)
          .filter(term => term.length > 2 && !term.match(/^(and|or)$/i))
          .map(term => term.trim())
      )
    );
  };

  const queryTerms = parseQueryTerms(query);

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2 text-muted-foreground">Query Terms:</h3>
      <div className="flex flex-wrap gap-2">
        {queryTerms.map((term) => {
          const isSelected = selectedTerms.includes(term);
          return (
            <Button
              key={term}
              size="sm"
              variant={isSelected ? "default" : "outline"}
              className={`flex items-center transition-all ${
                isSelected ? "bg-primary/80 text-primary-foreground" : "bg-background/50 text-muted-foreground"
              }`}
              onClick={() => onTermToggle(term)}
            >
              {term}
              {isSelected ? (
                <X className="ml-1 h-3 w-3" />
              ) : (
                <Plus className="ml-1 h-3 w-3" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default QueryTermSelector;
