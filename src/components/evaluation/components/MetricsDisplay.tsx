
import React from "react";
import { MetricsResult } from "../types";

interface MetricsDisplayProps {
  metrics: MetricsResult;
}

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ metrics }) => {
  const safeMetrics = metrics || { precision: 0, recall: 0, f1Score: 0 };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
      <div className="p-4 bg-primary/10 rounded-md">
        <p className="text-sm text-muted-foreground mb-1">Precision</p>
        <p className="text-2xl font-semibold">{((safeMetrics.precision || 0) * 100).toFixed(1)}%</p>
      </div>
      <div className="p-4 bg-primary/10 rounded-md">
        <p className="text-sm text-muted-foreground mb-1">Recall</p>
        <p className="text-2xl font-semibold">{((safeMetrics.recall || 0) * 100).toFixed(1)}%</p>
      </div>
      <div className="p-4 bg-primary/10 rounded-md">
        <p className="text-sm text-muted-foreground mb-1">F1 Score</p>
        <p className="text-2xl font-semibold">{((safeMetrics.f1Score || 0) * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
};

export default MetricsDisplay;
