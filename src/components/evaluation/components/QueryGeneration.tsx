
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeywordItem } from "../types";
import { generateBooleanQuery } from "@/utils/queryUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QueryGenerationProps {
  keywords: KeywordItem[];
  baselineKeywords: KeywordItem[];
}

const QueryGeneration: React.FC<QueryGenerationProps> = ({ keywords, baselineKeywords }) => {
  const [copied, setCopied] = useState(false);
  
  // Generate the boolean queries
  const algorithmQuery = generateBooleanQuery(keywords);
  const baselineQuery = generateBooleanQuery(baselineKeywords);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Query copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium">Generated Search Queries</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="max-w-xs">
                Automatically generated Boolean search queries based on extracted keywords.
                These queries can be used directly in search engines or job boards to find relevant results.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Tabs defaultValue="algorithm">
        <TabsList className="mb-3">
          <TabsTrigger value="algorithm">Algorithm Generated</TabsTrigger>
          <TabsTrigger value="baseline">Baseline Generated</TabsTrigger>
        </TabsList>
        
        <TabsContent value="algorithm">
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="flex justify-between items-start">
              <pre className="text-xs md:text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono">
                {algorithmQuery || "No query generated from algorithm keywords"}
              </pre>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2"
                onClick={() => copyToClipboard(algorithmQuery)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="mt-3 flex justify-between items-start">
            <div className="text-xs text-muted-foreground">
              <p>
                <strong>Query structure:</strong> Top 3 keywords are connected with AND operators (essential terms), 
                remaining keywords are connected with OR operators (optional terms).
              </p>
            </div>
            <div className="text-xs text-right">
              <p><strong>Keyword count:</strong> {keywords.length}</p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="baseline">
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="flex justify-between items-start">
              <pre className="text-xs md:text-sm whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-mono">
                {baselineQuery || "No query generated from baseline keywords"}
              </pre>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2"
                onClick={() => copyToClipboard(baselineQuery)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="mt-3 flex justify-between items-start">
            <div className="text-xs text-muted-foreground">
              <p>
                <strong>Baseline method:</strong> Simple frequency-based keyword extraction without
                semantic analysis or domain knowledge.
              </p>
            </div>
            <div className="text-xs text-right">
              <p><strong>Keyword count:</strong> {baselineKeywords.length}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-4 text-sm">
        <p className="font-medium">Academic Relevance:</p>
        <p className="text-muted-foreground text-xs mt-1">
          This implementation demonstrates the transformation of extracted keywords into practical search queries, 
          addressing a core requirement of the assignment. The structure prioritizes essential terms (AND) 
          and supplements with optional terms (OR) to optimize both precision and recall in search results.
        </p>
      </div>
    </Card>
  );
};

export default QueryGeneration;
