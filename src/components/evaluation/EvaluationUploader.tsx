
import React, { useState } from "react";
import { toast } from "sonner";
import { EvaluationDataItem, EvaluationResult } from "./types";
import { runEvaluation } from "./evaluationService";
import FileUploadSection from "./FileUploadSection";
import DatasetPreview from "./DatasetPreview";
import FormatDocumentation from "./FormatDocumentation";
import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EvaluationUploaderProps {
  onDataLoaded: (data: EvaluationDataItem[]) => void;
  onProcessingStart: () => void;
  onProcessingComplete: (results: EvaluationResult) => void;
  isProcessing: boolean;
  dataItems: EvaluationDataItem[];
}

const EvaluationUploader: React.FC<EvaluationUploaderProps> = ({
  onDataLoaded,
  onProcessingStart,
  onProcessingComplete,
  isProcessing,
  dataItems
}) => {
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const handleRunEvaluation = async () => {
    if (dataItems.length === 0) {
      toast.error("Please upload a dataset first");
      return;
    }

    setEvaluationError(null);
    onProcessingStart();
    
    try {
      // Show a warning if dataset is large
      if (dataItems.length > 10) {
        toast.info(`Processing ${dataItems.length} items. This may take some time.`);
      }
      
      const results = await runEvaluation(dataItems);
      onProcessingComplete(results);
      toast.success("Evaluation completed successfully");
    } catch (error) {
      console.error("Evaluation error:", error);
      setEvaluationError((error as Error).message || "Error during evaluation process");
      toast.error("Error during evaluation process");
    }
  };

  return (
    <div className="space-y-6">
      <Alert variant="default" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4" />
        <AlertTitle>School Project Mode</AlertTitle>
        <AlertDescription>
          Using offline keyword extraction algorithm optimized for academic evaluation. 
          No paid APIs are required.
        </AlertDescription>
      </Alert>

      <FileUploadSection 
        onDataLoaded={onDataLoaded}
        isProcessing={isProcessing}
      />

      {evaluationError && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {evaluationError}
          </AlertDescription>
        </Alert>
      )}

      <DatasetPreview 
        dataItems={dataItems}
        isProcessing={isProcessing}
        onRunEvaluation={handleRunEvaluation}
      />

      <FormatDocumentation />
    </div>
  );
};

export default EvaluationUploader;
