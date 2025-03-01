
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, X } from "lucide-react";

interface KeywordDisplayProps {
  keywords: Array<{
    keyword: string;
    category?: string;
    frequency: number;
  }>;
  onRemoveKeyword: (keyword: string) => void;
}

const KeywordDisplay: React.FC<KeywordDisplayProps> = ({
  keywords,
  onRemoveKeyword,
}) => {
  console.log('KeywordDisplay rendering with keywords:', keywords);
  
  return (
    <Card className="cyber-card p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow mb-4">
        <Terminal className="inline mr-2 h-5 w-5" />
        Keywords ({keywords?.length || 0})
      </h2>
      <ScrollArea className="h-[200px] pr-4 matrix-loader">
        <div className="flex flex-wrap gap-2">
          {!keywords || keywords.length === 0 ? (
            <div className="text-muted-foreground italic">
              No keywords extracted yet...
            </div>
          ) : (
            keywords.map((keywordObj, index) => (
              <Badge
                key={`${keywordObj.keyword}-${index}`}
                variant="outline"
                className="px-3 py-1 text-sm flex items-center gap-2 cyber-card group hover:neon-glow transition-all data-stream"
              >
                {keywordObj.keyword}
                {keywordObj.category && (
                  <span className="text-xs opacity-50">({keywordObj.category})</span>
                )}
                <span className="text-xs opacity-50">({keywordObj.frequency})</span>
                <X
                  size={14}
                  className="cursor-pointer opacity-50 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemoveKeyword(keywordObj.keyword)}
                />
              </Badge>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default KeywordDisplay;
