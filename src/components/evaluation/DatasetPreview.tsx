
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Loader2 } from "lucide-react";
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
  // Check if dataItems is a valid array with items
  const validDataItems = Array.isArray(dataItems) && dataItems.length > 0;
  
  if (!validDataItems) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Dataset Preview</h3>
            <p className="text-sm text-muted-foreground">
              No evaluation items loaded yet
            </p>
          </div>
          <Button 
            onClick={onRunEvaluation} 
            disabled={true}
            className="cyber-card"
            variant="outline"
          >
            <Play className="mr-2 h-4 w-4" />
            Run Evaluation
          </Button>
        </div>
      </div>
    );
  }

  // Safely get the first few items to display with additional validation
  const previewItems = dataItems.slice(0, 2).map((item) => ({
    id: item.id || "",
    description: typeof item.description === 'string' ? item.description : '',
    groundTruth: Array.isArray(item.groundTruth) ? item.groundTruth.filter(kw => 
      kw && typeof kw === 'object' && 
      typeof kw.keyword === 'string' && 
      (typeof kw.frequency === 'number' || kw.frequency === undefined)
    ) : []
  }));

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
          variant={isProcessing ? "outline" : "default"}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Evaluation
            </>
          )}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {previewItems.map((item, index) => (
          <Card key={index} className="p-3 text-xs bg-background/50 border-primary/20">
            <p className="font-medium mb-1">
              Item {index + 1}: {(item.groundTruth && item.groundTruth.length) || 0} keywords
            </p>
            <p className="line-clamp-2 text-muted-foreground">
              {(item.description && item.description.substring(0, 150) + '...') || 'No description available'}
            </p>
          </Card>
        ))}
      </div>
      
      {dataItems.length > 2 && (
        <p className="text-xs text-muted-foreground">
          And {dataItems.length - 2} more items...
        </p>
      )}

      {isProcessing && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p className="animate-pulse">
            Processing dataset... 
            This might take a while for large datasets.
            {dataItems.length > 10 && " Using a mix of AI and baseline algorithms to stay within API limits."}
          </p>
        </div>
      )}
    </div>
  );
};

export default DatasetPreview;
