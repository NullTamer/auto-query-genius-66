
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
  const metricsData = [
    {
      name: "Precision",
      AI: parseFloat((results.overall.precision * 100).toFixed(2)),
      Baseline: parseFloat((results.baseline.precision * 100).toFixed(2)),
    },
    {
      name: "Recall",
      AI: parseFloat((results.overall.recall * 100).toFixed(2)),
      Baseline: parseFloat((results.baseline.recall * 100).toFixed(2)),
    },
    {
      name: "F1 Score",
      AI: parseFloat((results.overall.f1Score * 100).toFixed(2)),
      Baseline: parseFloat((results.baseline.f1Score * 100).toFixed(2)),
    },
  ];

  const renderKeywordList = (keywords: KeywordItem[]) => (
    <ScrollArea className="h-[200px]">
      <div className="flex flex-wrap gap-2 p-2">
        {keywords.map((keyword, index) => (
          <Badge
            key={index}
            variant="outline"
            className="px-3 py-1 text-sm flex items-center gap-2"
          >
            {keyword.keyword}
            <span className="text-xs opacity-50">({keyword.frequency})</span>
          </Badge>
        ))}
      </div>
    </ScrollArea>
  );

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
            <p className="text-2xl font-semibold">{(results.overall.precision * 100).toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-md">
            <p className="text-sm text-muted-foreground mb-1">Recall</p>
            <p className="text-2xl font-semibold">{(results.overall.recall * 100).toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-md">
            <p className="text-sm text-muted-foreground mb-1">F1 Score</p>
            <p className="text-2xl font-semibold">{(results.overall.f1Score * 100).toFixed(1)}%</p>
          </div>
        </div>
      </Card>

      {results.perItem.length > 0 && (
        <Tabs defaultValue={results.perItem[0]?.id?.toString() || "item0"}>
          <h3 className="text-lg font-medium mb-4">Per-Item Results</h3>
          <TabsList className="mb-4 overflow-x-auto flex w-full">
            {results.perItem.map((item, index) => (
              <TabsTrigger key={index} value={item.id?.toString() || `item${index}`}>
                Item {index + 1}
              </TabsTrigger>
            ))}
          </TabsList>

          {results.perItem.map((item, index) => (
            <TabsContent key={index} value={item.id?.toString() || `item${index}`}>
              <Card className="p-4 md:p-6 cyber-card">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-center">
                  <div className="p-3 bg-primary/10 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">Precision</p>
                    <p className="text-xl font-semibold">{(item.metrics.precision * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">Recall</p>
                    <p className="text-xl font-semibold">{(item.metrics.recall * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">F1 Score</p>
                    <p className="text-xl font-semibold">{(item.metrics.f1Score * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Ground Truth Keywords ({item.groundTruth.length})</h4>
                    {renderKeywordList(item.groundTruth)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">AI Extracted Keywords ({item.extractedKeywords.length})</h4>
                    {renderKeywordList(item.extractedKeywords)}
                  </div>
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default EvaluationResults;
