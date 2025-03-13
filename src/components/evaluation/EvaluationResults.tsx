
import React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvaluationResult, KeywordItem } from "./types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface EvaluationResultsProps {
  results: EvaluationResult;
}

const EvaluationResults: React.FC<EvaluationResultsProps> = ({ results }) => {
  // Comprehensive validation of results data
  const isValidResults = results && 
    typeof results === 'object' &&
    results.overall && 
    typeof results.overall === 'object' &&
    Array.isArray(results.perItem);

  if (!isValidResults) {
    return (
      <Card className="p-4 md:p-6 cyber-card">
        <p className="text-center text-muted-foreground">
          No valid evaluation results to display
        </p>
      </Card>
    );
  }

  // Ensure baseline data exists with fallbacks
  const baseline = results.baseline || { precision: 0, recall: 0, f1Score: 0 };
  
  // Ensure overall metrics exist with fallbacks
  const overall = results.overall || { precision: 0, recall: 0, f1Score: 0 };

  // Prepare chart data with safe values
  const metricsData = [
    {
      name: "Precision",
      AI: parseFloat(((overall.precision || 0) * 100).toFixed(2)),
      Baseline: parseFloat(((baseline.precision || 0) * 100).toFixed(2)),
    },
    {
      name: "Recall",
      AI: parseFloat(((overall.recall || 0) * 100).toFixed(2)),
      Baseline: parseFloat(((baseline.recall || 0) * 100).toFixed(2)),
    },
    {
      name: "F1 Score",
      AI: parseFloat(((overall.f1Score || 0) * 100).toFixed(2)),
      Baseline: parseFloat(((baseline.f1Score || 0) * 100).toFixed(2)),
    },
  ];

  const renderKeywordList = (keywords: KeywordItem[]) => {
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
        <p className="text-xs text-muted-foreground p-2">No keywords available</p>
      );
    }
    
    return (
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
    );
  };

  // Filter out any invalid perItem entries with comprehensive validation
  const validPerItemResults = (results.perItem || []).filter(item => 
    item && 
    typeof item === 'object' &&
    (item.id !== undefined && item.id !== null) &&
    item.metrics && 
    typeof item.metrics === 'object' &&
    Array.isArray(item.groundTruth) && 
    Array.isArray(item.extractedKeywords)
  );

  if (validPerItemResults.length === 0) {
    return (
      <Card className="p-4 md:p-6 cyber-card">
        <h3 className="text-lg font-medium mb-4">Overall Performance Metrics</h3>
        
        <div className="h-[300px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, '']} />
              <Legend />
              <Bar dataKey="AI" fill="#22c55e" name="AI Algorithm" />
              <Bar dataKey="Baseline" fill="#3b82f6" name="Baseline" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-primary/10 rounded-md">
            <p className="text-sm text-muted-foreground mb-1">Precision</p>
            <p className="text-2xl font-semibold">{((overall.precision || 0) * 100).toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-md">
            <p className="text-sm text-muted-foreground mb-1">Recall</p>
            <p className="text-2xl font-semibold">{((overall.recall || 0) * 100).toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-md">
            <p className="text-sm text-muted-foreground mb-1">F1 Score</p>
            <p className="text-2xl font-semibold">{((overall.f1Score || 0) * 100).toFixed(1)}%</p>
          </div>
        </div>
        
        <p className="mt-4 text-center text-muted-foreground">
          No valid per-item results available for detailed analysis
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-6 cyber-card">
        <h3 className="text-lg font-medium mb-4">Overall Performance Metrics</h3>
        
        <div className="h-[300px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, '']} />
              <Legend />
              <Bar dataKey="AI" fill="#22c55e" name="AI Algorithm" />
              <Bar dataKey="Baseline" fill="#3b82f6" name="Baseline" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-primary/10 rounded-md">
            <p className="text-sm text-muted-foreground mb-1">Precision</p>
            <p className="text-2xl font-semibold">{((overall.precision || 0) * 100).toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-md">
            <p className="text-sm text-muted-foreground mb-1">Recall</p>
            <p className="text-2xl font-semibold">{((overall.recall || 0) * 100).toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-md">
            <p className="text-sm text-muted-foreground mb-1">F1 Score</p>
            <p className="text-2xl font-semibold">{((overall.f1Score || 0) * 100).toFixed(1)}%</p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue={validPerItemResults[0]?.id?.toString() || "item0"}>
        <h3 className="text-lg font-medium mb-4">Per-Item Results</h3>
        <TabsList className="mb-4 overflow-x-auto flex w-full">
          {validPerItemResults.map((item, index) => (
            <TabsTrigger key={index} value={item.id?.toString() || `item${index}`}>
              Item {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>

        {validPerItemResults.map((item, index) => {
          // Ensure item.metrics exists with fallbacks
          const metrics = item.metrics || { precision: 0, recall: 0, f1Score: 0 };
          
          return (
            <TabsContent key={index} value={item.id?.toString() || `item${index}`}>
              <Card className="p-4 md:p-6 cyber-card">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-center">
                  <div className="p-3 bg-primary/10 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">Precision</p>
                    <p className="text-xl font-semibold">{((metrics.precision || 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">Recall</p>
                    <p className="text-xl font-semibold">{((metrics.recall || 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">F1 Score</p>
                    <p className="text-xl font-semibold">{((metrics.f1Score || 0) * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Ground Truth Keywords ({Array.isArray(item.groundTruth) ? item.groundTruth.length : 0})</h4>
                    {renderKeywordList(item.groundTruth || [])}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">AI Extracted Keywords ({Array.isArray(item.extractedKeywords) ? item.extractedKeywords.length : 0})</h4>
                    {renderKeywordList(item.extractedKeywords || [])}
                  </div>
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default EvaluationResults;
