
import React, { useState } from "react";
import { toast } from "sonner";
import { EvaluationDataItem, EvaluationResult } from "./types";
import { runEvaluation } from "./evaluationService";
import FileUploadSection from "./FileUploadSection";
import DatasetPreview from "./DatasetPreview";
import FormatDocumentation from "./FormatDocumentation";

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
  const handleRunEvaluation = async () => {
    if (dataItems.length === 0) {
      toast.error("Please upload a dataset first");
      return;
    }

    onProcessingStart();
    
    try {
      const results = await runEvaluation(dataItems);
      onProcessingComplete(results);
      toast.success("Evaluation completed successfully");
    } catch (error) {
      console.error("Evaluation error:", error);
      toast.error("Error during evaluation process");
    }
  };

  return (
    <div className="space-y-6">
      <FileUploadSection 
        onDataLoaded={onDataLoaded}
        isProcessing={isProcessing}
      />

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
