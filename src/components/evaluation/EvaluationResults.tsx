
import React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvaluationResult } from "./types";
import MetricsChart from "./components/MetricsChart";
import MetricsDisplay from "./components/MetricsDisplay";
import ItemDetails from "./components/ItemDetails";
import AdvancedMetricsDisplay from "./components/AdvancedMetricsDisplay";
import ExportResults from "./components/ExportResults";

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

  // Check if advanced metrics are available
  const hasAdvancedMetrics = results.advanced && 
    typeof results.advanced === 'object' &&
    results.advanced.mean && 
    results.advanced.median && 
    results.advanced.stdDev;

  if (validPerItemResults.length === 0) {
    return (
      <Card className="p-4 md:p-6 cyber-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Overall Performance Metrics</h3>
          <ExportResults results={results} />
        </div>
        
        <div className="mb-4">
          <MetricsChart overall={overall} baseline={baseline} />
        </div>
        
        <MetricsDisplay metrics={overall} />
        
        {hasAdvancedMetrics && (
          <div className="mt-6">
            <AdvancedMetricsDisplay advancedMetrics={results.advanced!} />
          </div>
        )}
        
        <p className="mt-4 text-center text-muted-foreground">
          No valid per-item results available for detailed analysis
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-6 cyber-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Overall Performance Metrics</h3>
          <ExportResults results={results} />
        </div>
        
        <div className="mb-4">
          <MetricsChart overall={overall} baseline={baseline} />
        </div>
        
        <MetricsDisplay metrics={overall} />
      </Card>
      
      {hasAdvancedMetrics && (
        <AdvancedMetricsDisplay advancedMetrics={results.advanced!} />
      )}

      <Tabs defaultValue={validPerItemResults[0]?.id?.toString() || "item0"}>
        <h3 className="text-lg font-medium mb-4">Per-Item Results</h3>
        <TabsList className="mb-4 overflow-x-auto flex w-full">
          {validPerItemResults.map((item, index) => (
            <TabsTrigger key={index} value={item.id?.toString() || `item${index}`}>
              Item {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>

        {validPerItemResults.map((item, index) => (
          <TabsContent key={index} value={item.id?.toString() || `item${index}`}>
            <ItemDetails 
              metrics={item.metrics || { precision: 0, recall: 0, f1Score: 0 }}
              groundTruth={item.groundTruth || []}
              extractedKeywords={item.extractedKeywords || []}
              error={item.error}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default EvaluationResults;
