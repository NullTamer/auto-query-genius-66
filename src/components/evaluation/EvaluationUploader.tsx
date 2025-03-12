
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Play, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { EvaluationDataItem, EvaluationResult } from "./types";
import { runEvaluation } from "./evaluationService";
import Papa from "papaparse";

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
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): EvaluationDataItem[] => {
    const results = Papa.parse(text, { header: true, skipEmptyLines: true });
    
    if (!results.data || !Array.isArray(results.data) || results.data.length === 0) {
      throw new Error("Invalid CSV format or empty file");
    }

    return results.data.map((row: any, index) => {
      // Extract ground truth keywords from the CSV
      // Assuming format: keyword1:frequency,keyword2:frequency
      const groundTruthStr = row.groundTruth || "";
      const groundTruth = groundTruthStr.split(',')
        .map(item => {
          const [keyword, frequency] = item.split(':');
          return {
            keyword: keyword?.trim() || "",
            frequency: parseInt(frequency?.trim() || "1", 10) || 1
          };
        })
        .filter(item => item.keyword); // Remove empty items

      return {
        id: row.id || `item-${index}`,
        description: row.description || "",
        groundTruth
      };
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let parsed: EvaluationDataItem[];

        // Process based on file extension
        if (file.name.toLowerCase().endsWith('.csv')) {
          parsed = parseCSV(content);
        } else if (file.name.toLowerCase().endsWith('.json')) {
          parsed = JSON.parse(content);
          
          // Validate JSON structure
          if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error("Invalid dataset format. Expecting an array of evaluation items.");
          }

          const isValid = parsed.every((item: any) => 
            item.description && 
            Array.isArray(item.groundTruth) &&
            item.groundTruth.every((k: any) => k.keyword && typeof k.frequency === 'number')
          );

          if (!isValid) {
            throw new Error("Invalid dataset structure. Check the documentation for the correct format.");
          }
        } else {
          throw new Error("Unsupported file format. Please upload a .json or .csv file.");
        }

        toast.success(`Successfully loaded dataset with ${parsed.length} items`);
        onDataLoaded(parsed);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error(`Failed to parse dataset: ${(error as Error).message}`);
        setFileName(null);
      }
    };

    reader.readAsText(file);
  };

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
      <Card className="cyber-card p-4 border border-dashed border-primary/30 hover:border-primary/50 transition-all">
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <Upload className="h-12 w-12 text-primary/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Upload Evaluation Dataset</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Upload a JSON or CSV file containing job descriptions and manually annotated keywords.
            See documentation for the required format.
          </p>
          <Button 
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="cyber-card"
          >
            <FileText className="mr-2 h-4 w-4" />
            Choose File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          {fileName && (
            <p className="mt-2 text-xs text-primary">
              {fileName}
            </p>
          )}
        </div>
      </Card>

      {dataItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Dataset Preview</h3>
              <p className="text-sm text-muted-foreground">
                {dataItems.length} evaluation items loaded
              </p>
            </div>
            <Button 
              onClick={handleRunEvaluation} 
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
      )}

      <div className="bg-primary/10 rounded-md p-4 text-sm">
        <h4 className="flex items-center text-primary font-medium mb-2">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Dataset Format
        </h4>
        <p className="mb-2">The evaluation tool accepts the following file formats:</p>
        
        <div className="space-y-4">
          <div>
            <h5 className="font-medium text-xs mb-1">JSON Format</h5>
            <pre className="bg-black/20 p-3 rounded text-xs overflow-auto">
{`[
  {
    "id": "job1",
    "description": "Full job description text...",
    "groundTruth": [
      { "keyword": "React", "frequency": 5, "category": "technical" },
      { "keyword": "JavaScript", "frequency": 4 }
    ]
  },
  ...
]`}
            </pre>
          </div>
          
          <div>
            <h5 className="font-medium text-xs mb-1">CSV Format</h5>
            <pre className="bg-black/20 p-3 rounded text-xs overflow-auto">
{`id,description,groundTruth
job1,"Full job description text...","React:5,JavaScript:4,TypeScript:3"
job2,"Another job description...","Python:6,AWS:4,Docker:2"
...`}
            </pre>
            <p className="mt-1 text-xs">
              For CSV files, the groundTruth column should contain comma-separated keyword:frequency pairs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationUploader;
