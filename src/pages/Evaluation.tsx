
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import NavigationPane from "@/components/layout/NavigationPane";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EvaluationUploader from "@/components/evaluation/EvaluationUploader";
import EvaluationResults from "@/components/evaluation/EvaluationResults";
import BaselineComparison from "@/components/evaluation/BaselineComparison";
import { EvaluationDataItem, EvaluationResult } from "@/components/evaluation/types";
import { toast } from "sonner";

const Evaluation = () => {
  const [evaluationData, setEvaluationData] = useState<EvaluationDataItem[]>([]);
  const [results, setResults] = useState<EvaluationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");

  // Log state changes for debugging
  useEffect(() => {
    console.log("Evaluation data updated:", {
      itemCount: evaluationData.length,
      firstItem: evaluationData[0] || null
    });
  }, [evaluationData]);

  useEffect(() => {
    console.log("Results updated:", {
      hasResults: !!results,
      overall: results?.overall || null,
      itemCount: results?.perItem?.length || 0
    });
  }, [results]);

  // Handle data loading (from file upload)
  const handleDataLoaded = (newData: EvaluationDataItem[]) => {
    console.log("Data loaded:", newData.length);
    if (Array.isArray(newData) && newData.length > 0) {
      setEvaluationData(newData);
      // Reset results when new data is loaded
      setResults(null);
    } else {
      toast.error("No valid data items found in the uploaded file");
    }
  };

  // Update active tab when results become available
  const handleResultsComplete = (newResults: EvaluationResult) => {
    console.log("Processing complete, handling results:", {
      hasOverall: !!newResults?.overall,
      hasBaseline: !!newResults?.baseline,
      itemCount: newResults?.perItem?.length || 0
    });

    if (newResults && typeof newResults === 'object') {
      // Ensure we have a valid results object with proper fallbacks
      const validResults: EvaluationResult = {
        overall: {
          precision: newResults.overall?.precision || 0, 
          recall: newResults.overall?.recall || 0, 
          f1Score: newResults.overall?.f1Score || 0,
          averageRankCorrelation: newResults.overall?.averageRankCorrelation || 0
        },
        baseline: {
          precision: newResults.baseline?.precision || 0, 
          recall: newResults.baseline?.recall || 0, 
          f1Score: newResults.baseline?.f1Score || 0,
          averageRankCorrelation: newResults.baseline?.averageRankCorrelation || 0
        },
        perItem: Array.isArray(newResults.perItem) 
          ? newResults.perItem.filter(item => item && typeof item === 'object') 
          : []
      };
      
      // Set the validated results
      setResults(validResults);
      setIsProcessing(false);
      
      // Only switch to results tab if we have valid data
      if (validResults.perItem.length > 0) {
        setActiveTab("results");
        toast.success("Evaluation completed successfully");
      } else {
        toast.error("Evaluation completed but no valid results were produced");
      }
    } else {
      console.error("Invalid results received:", newResults);
      setIsProcessing(false);
      toast.error("Failed to process evaluation results");
    }
  };

  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <NavigationPane />
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 ml-16">
        <Card className="cyber-card p-4 md:p-6 animate-fade-in">
          <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow mb-4">
            Algorithm Evaluation Dashboard
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Evaluate the performance of the keyword extraction algorithm against a ground truth dataset.
            Upload a dataset (JSON or CSV), run the evaluation, and compare results with baseline methods.
          </p>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="upload">Upload Dataset</TabsTrigger>
              <TabsTrigger value="results" disabled={!results}>Results</TabsTrigger>
              <TabsTrigger value="baseline" disabled={!results}>Baseline Comparison</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload">
              <EvaluationUploader 
                onDataLoaded={handleDataLoaded} 
                onProcessingStart={() => {
                  console.log("Processing started");
                  setIsProcessing(true);
                }}
                onProcessingComplete={handleResultsComplete}
                isProcessing={isProcessing}
                dataItems={evaluationData}
              />
            </TabsContent>
            
            <TabsContent value="results">
              {results ? (
                <EvaluationResults results={results} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No evaluation results available yet. Please upload a dataset and run evaluation.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="baseline">
              {results ? (
                <BaselineComparison results={results} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No baseline comparison data available yet. Please upload a dataset and run evaluation.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Evaluation;
