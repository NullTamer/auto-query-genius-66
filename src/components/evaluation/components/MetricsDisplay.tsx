
import React from "react";
import { MetricsResult } from "../types";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface MetricsDisplayProps {
  metrics: MetricsResult;
  showTooltips?: boolean;
}

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ 
  metrics, 
  showTooltips = true 
}) => {
  const safeMetrics = metrics || { precision: 0, recall: 0, f1Score: 0 };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
      <TooltipProvider>
        <div className="p-4 bg-primary/10 rounded-md">
          <div className="flex justify-center items-center gap-1 mb-1">
            <p className="text-sm text-muted-foreground">Precision</p>
            {showTooltips && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Precision measures the fraction of correctly identified keywords among all extracted keywords.
                    Higher is better (Range: 0-100%).
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-2xl font-semibold">{((safeMetrics.precision || 0) * 100).toFixed(1)}%</p>
        </div>
        
        <div className="p-4 bg-primary/10 rounded-md">
          <div className="flex justify-center items-center gap-1 mb-1">
            <p className="text-sm text-muted-foreground">Recall</p>
            {showTooltips && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Recall measures the fraction of ground truth keywords that were correctly identified.
                    Higher is better (Range: 0-100%).
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-2xl font-semibold">{((safeMetrics.recall || 0) * 100).toFixed(1)}%</p>
        </div>
        
        <div className="p-4 bg-primary/10 rounded-md">
          <div className="flex justify-center items-center gap-1 mb-1">
            <p className="text-sm text-muted-foreground">F1 Score</p>
            {showTooltips && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    F1 Score is the harmonic mean of precision and recall, providing a balanced measure.
                    Higher is better (Range: 0-100%).
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-2xl font-semibold">{((safeMetrics.f1Score || 0) * 100).toFixed(1)}%</p>
        </div>
      </TooltipProvider>
    </div>
  );
};

export default MetricsDisplay;
