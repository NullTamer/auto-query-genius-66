
import React from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KeywordItem } from "../types";

interface KeywordListProps {
  keywords: KeywordItem[];
  title: string;
}

const KeywordList: React.FC<KeywordListProps> = ({ keywords, title }) => {
  // Ensure keywords is an array and filter out invalid items
  const safeKeywords = Array.isArray(keywords) 
    ? keywords.filter(k => 
        k && 
        typeof k === 'object' && 
        typeof k.keyword === 'string' &&
        (typeof k.frequency === 'number' || k.frequency === undefined)
      )
    : [];
  
  if (safeKeywords.length === 0) {
    return (
      <div>
        <h4 className="text-sm font-medium mb-2">{title} (0)</h4>
        <p className="text-xs text-muted-foreground p-2">No keywords available</p>
      </div>
    );
  }
  
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{title} ({safeKeywords.length})</h4>
      <ScrollArea className="h-[200px]">
        <div className="flex flex-wrap gap-2 p-2">
          {safeKeywords.map((keyword, index) => (
            <Badge
              key={index}
              variant="outline"
              className="px-3 py-1 text-sm flex items-center gap-2"
            >
              {keyword.keyword || ""}
              <span className="text-xs opacity-50">({keyword.frequency || 0})</span>
            </Badge>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default KeywordList;
