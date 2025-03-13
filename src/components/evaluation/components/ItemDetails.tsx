
import React from "react";
import { Card } from "@/components/ui/card";
import KeywordList from "./KeywordList";
import MetricsDisplay from "./MetricsDisplay";
import { KeywordItem, MetricsResult } from "../types";

interface ItemDetailsProps {
  metrics: MetricsResult;
  groundTruth: KeywordItem[];
  extractedKeywords: KeywordItem[];
}

const ItemDetails: React.FC<ItemDetailsProps> = ({
  metrics,
  groundTruth,
  extractedKeywords
}) => {
  return (
    <Card className="p-4 md:p-6 cyber-card">
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
