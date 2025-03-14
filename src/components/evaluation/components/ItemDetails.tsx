
import React from "react";
import { Card } from "@/components/ui/card";
import KeywordList from "./KeywordList";
import MetricsDisplay from "./MetricsDisplay";
import { KeywordItem, MetricsResult } from "../types";
import ErrorDisplay from "./ErrorDisplay";

interface ItemDetailsProps {
  metrics: MetricsResult;
  groundTruth: KeywordItem[];
  extractedKeywords: KeywordItem[];
  error?: string | null;
}

const ItemDetails: React.FC<ItemDetailsProps> = ({
  metrics,
  groundTruth,
  extractedKeywords,
  error
}) => {
  // Check if we have zero metrics - this could indicate processing issues
  const hasZeroMetrics = metrics && 
    metrics.precision === 0 && 
    metrics.recall === 0 && 
    metrics.f1Score === 0;
  
  return (
    <Card className="p-4 md:p-6 cyber-card">
      {error && (
        <div className="mb-4">
          <ErrorDisplay 
            error={error} 
            severity="warning"
            showNetworkTips={error.includes("network") || error.includes("blocked")}
          />
        </div>
      )}
      
      {hasZeroMetrics && !error && (
        <div className="mb-4">
          <ErrorDisplay 
            error="All metrics are zero. This may indicate a format mismatch between ground truth and extracted keywords." 
            severity="warning"
            title="Possible Data Format Issue"
          />
        </div>
      )}

      <div className="mb-4">
        <MetricsDisplay metrics={metrics} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KeywordList 
          title="Ground Truth Keywords" 
          keywords={groundTruth} 
        />
        <KeywordList 
          title="AI Extracted Keywords" 
          keywords={extractedKeywords}
        />
      </div>
    </Card>
  );
};

export default ItemDetails;
