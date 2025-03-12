
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play } from "lucide-react";
import { EvaluationDataItem } from "./types";

interface DatasetPreviewProps {
  dataItems: EvaluationDataItem[];
  isProcessing: boolean;
  onRunEvaluation: () => void;
}

const DatasetPreview: React.FC<DatasetPreviewProps> = ({
  dataItems,
  isProcessing,
  onRunEvaluation
}) => {
  if (dataItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Dataset Preview</h3>
          <p className="text-sm text-muted-foreground">
            {dataItems.length} evaluation items loaded
          </p>
        </div>
        <Button 
          onClick={onRunEvaluation} 
          disabled={isProcessing}
          className="cyber-card"
        >
          {isProcessing ? "Processing..." : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Evaluation
            </>
          )}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataItems.slice(0, 2).map((item, index) => (
          <Card key={index} className="p-3 text-xs bg-background/50 border-primary/20">
            <p className="font-medium mb-1">Item {index + 1}: {item.groundTruth.length} keywords</p>
            <p className="line-clamp-2 text-muted-foreground">
              {item.description.substring(0, 150)}...
            </p>
          </Card>
        ))}
      </div>
      
      {dataItems.length > 2 && (
        <p className="text-xs text-muted-foreground">
          And {dataItems.length - 2} more items...
        </p>
      )}
    </div>
  );
};

export default DatasetPreview;
