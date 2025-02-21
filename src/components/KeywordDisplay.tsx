
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

interface KeywordDisplayProps {
  keywords: string[];
  onRemoveKeyword: (keyword: string) => void;
}

const KeywordDisplay: React.FC<KeywordDisplayProps> = ({
  keywords,
  onRemoveKeyword,
}) => {
  return (
    <Card className="p-6 backdrop-blur-lg bg-glass shadow-lg animate-fade-in">
      <h2 className="text-2xl font-semibold text-secondary mb-4">Keywords</h2>
      <ScrollArea className="h-[200px] pr-4">
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="px-3 py-1 text-sm flex items-center gap-2 group hover:bg-secondary/90"
            >
              {keyword}
              <X
                size={14}
                className="cursor-pointer opacity-50 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemoveKeyword(keyword)}
              />
            </Badge>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default KeywordDisplay;
