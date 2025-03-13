
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import NavigationPane from "@/components/layout/NavigationPane";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EvaluationUploader from "@/components/evaluation/EvaluationUploader";
import EvaluationResults from "@/components/evaluation/EvaluationResults";
import BaselineComparison from "@/components/evaluation/BaselineComparison";
import { EvaluationDataItem, EvaluationResult } from "@/components/evaluation/types";

const Evaluation = () => {
  const [evaluationData, setEvaluationData] = useState<EvaluationDataItem[]>([]);
  const [results, setResults] = useState<EvaluationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");

  // Update active tab when results become available
  const handleResultsComplete = (newResults: EvaluationResult) => {
    if (newResults && typeof newResults === 'object') {
      // Make sure we have a valid results object
      const validResults = {
        overall: newResults.overall || { precision: 0, recall: 0, f1Score: 0 },
        baseline: newResults.baseline || { precision: 0, recall: 0, f1Score: 0 },
        perItem: Array.isArray(newResults.perItem) ? newResults.perItem : []
      };
      
      // Set the validated results
      setResults(validResults);
      setIsProcessing(false);
      setActiveTab("results");
    } else {
      console.error("Invalid results received:", newResults);
      setIsProcessing(false);
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
                onDataLoaded={setEvaluationData} 
                onProcessingStart={() => setIsProcessing(true)}
                onProcessingComplete={handleResultsComplete}
                isProcessing={isProcessing}
                dataItems={evaluationData}
              />
            </TabsContent>
            
            <TabsContent value="results">
              {results && <EvaluationResults results={results} />}
            </TabsContent>
            
            <TabsContent value="baseline">
              {results && <BaselineComparison results={results} />}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Evaluation;
