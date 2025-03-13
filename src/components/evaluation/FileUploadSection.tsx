import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { EvaluationDataItem } from "./types";
import Papa from "papaparse";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileUploadSectionProps {
  onDataLoaded: (data: EvaluationDataItem[]) => void;
  isProcessing: boolean;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  onDataLoaded,
  isProcessing
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [datasetSize, setDatasetSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): EvaluationDataItem[] => {
    try {
      const results = Papa.parse(text, { header: true, skipEmptyLines: true });
      
      if (!results.data || !Array.isArray(results.data) || results.data.length === 0) {
        throw new Error("Invalid CSV format or empty file");
      }

      console.log("CSV parsing result:", {
        rowCount: results.data.length,
        firstRow: results.data[0],
        fields: Object.keys(results.data[0] || {})
      });

      return results.data.map((row: any, index) => {
        // Ensure we have a valid row object
        if (!row || typeof row !== 'object') {
          console.warn("Invalid row at index", index, row);
          return null;
        }

        let description = "";
        let groundTruth: any[] = [];
        let id = row.company_name || row.id || `item-${index}`;
        
        // Handle the description field
        if (row.job_description || row.description) {
          description = row.job_description || row.description || "";
          
          // If there's a position_title, prepend it to the description
          if (row.position_title) {
            description = `${row.position_title}: ${description}`;
          }
        } else {
          console.warn("Row missing description at index", index);
        }
        
        // Try to parse ground truth from different possible formats
        if (row.model_response && typeof row.model_response === 'string') {
          try {
            // Attempt to parse the model_response as JSON
            const modelResponse = JSON.parse(row.model_response);
            
            // If it's an object with keywords, use those as groundTruth
            if (modelResponse && Array.isArray(modelResponse.keywords)) {
              groundTruth = modelResponse.keywords.map((kw: any) => ({
                keyword: kw.term || kw.keyword || "",
                frequency: kw.count || kw.frequency || 1
              }));
            } else if (modelResponse && typeof modelResponse === 'object') {
              // If it's just an object, create a simple array of keyword items
              groundTruth = Object.entries(modelResponse).map(([key, value]) => ({
                keyword: key,
                frequency: typeof value === 'number' ? value : 1
              }));
            }
          } catch (error) {
            console.warn("Could not parse model_response as JSON at index", index, error);
            
            // If parsing fails, try the original CSV format with groundTruth as a string
            if (row.groundTruth && typeof row.groundTruth === 'string') {
              groundTruth = parseGroundTruthString(row.groundTruth);
            }
          }
        } else if (row.groundTruth && typeof row.groundTruth === 'string') {
          // Fall back to original format if model_response isn't available
          groundTruth = parseGroundTruthString(row.groundTruth);
        } else if (row.keywords && typeof row.keywords === 'string') {
          // Try another possible field name
          groundTruth = parseGroundTruthString(row.keywords);
        }

        // Log if no ground truth was found
        if (groundTruth.length === 0) {
          console.warn("No ground truth found for row at index", index);
        }

        return {
          id,
          description,
          groundTruth
        };
      }).filter(Boolean); // Remove null items
    } catch (error) {
      console.error("Error parsing CSV:", error);
      throw error;
    }
  };

  // Helper function to parse ground truth string into keyword items
  const parseGroundTruthString = (groundTruthStr: string): any[] => {
    if (!groundTruthStr) return [];
    
    try {
      // Try to parse as JSON first
      if (groundTruthStr.trim().startsWith('[') || groundTruthStr.trim().startsWith('{')) {
        const parsed = JSON.parse(groundTruthStr);
        if (Array.isArray(parsed)) {
          return parsed.map(item => {
            if (typeof item === 'string') {
              return { keyword: item, frequency: 1 };
            } else if (item && typeof item === 'object') {
              return {
                keyword: item.keyword || item.term || "",
                frequency: item.frequency || item.count || 1
              };
            }
            return null;
          }).filter(Boolean);
        }
      }
      
      // Otherwise parse as comma-separated string
      return groundTruthStr.split(',')
        .map((item: string) => {
          const [keyword, frequency] = item.split(':');
          return {
            keyword: keyword?.trim() || "",
            frequency: parseInt(frequency?.trim() || "1", 10) || 1
          };
        })
        .filter((item: any) => item.keyword);
    } catch (error) {
      console.warn("Error parsing ground truth string:", error);
      return [];
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          throw new Error("Could not read file content");
        }
        
        let parsed: EvaluationDataItem[];

        // Process based on file extension
        if (file.name.toLowerCase().endsWith('.csv')) {
          parsed = parseCSV(content);
        } else if (file.name.toLowerCase().endsWith('.json')) {
          const jsonData = JSON.parse(content);
          
          // Validate JSON structure
          if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error("Invalid dataset format. Expecting an array of evaluation items.");
          }

          // Validate and transform items if needed
          parsed = jsonData.map((item, index) => {
            // Ensure required fields exist
            if (!item || typeof item !== 'object') {
              console.warn("Invalid item in JSON at index", index);
              return null;
            }
            
            // Ensure description exists
            if (!item.description) {
              console.warn("Missing description in item at index", index);
              return null;
            }
            
            // Validate and transform ground truth
            let groundTruth = [];
            if (Array.isArray(item.groundTruth)) {
              groundTruth = item.groundTruth.map((kw: any) => {
                if (typeof kw === 'string') {
                  return { keyword: kw, frequency: 1 };
                } else if (kw && typeof kw === 'object') {
                  return {
                    keyword: kw.keyword || "",
                    frequency: typeof kw.frequency === 'number' ? kw.frequency : 1
                  };
                }
                return null;
              }).filter(Boolean);
            } else {
              console.warn("Missing or invalid groundTruth in item at index", index);
            }
            
            return {
              id: item.id || `item-${index}`,
              description: item.description,
              groundTruth
            };
          }).filter(Boolean);
        } else {
          throw new Error("Unsupported file format. Please upload a .json or .csv file.");
        }

        // Further validation
        if (!parsed || parsed.length === 0) {
          throw new Error("No valid evaluation items found in the file.");
        }

        console.log("Parsed dataset:", {
          itemCount: parsed.length,
          firstItem: parsed[0],
          lastItem: parsed[parsed.length - 1]
        });

        setDatasetSize(parsed.length);
        
        // Warn if dataset is large
        if (parsed.length > 50) {
          toast.warning(`Large dataset (${parsed.length} items) detected. Evaluation may use baseline algorithm for some items to conserve API quota.`, {
            duration: 7000
          });
        } else {
          toast.success(`Successfully loaded dataset with ${parsed.length} items`);
        }
        
        onDataLoaded(parsed);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error(`Failed to parse dataset: ${(error as Error).message}`);
        setFileName(null);
        setDatasetSize(0);
      }
    };

    reader.readAsText(file);
  };

  return (
    <Card className="cyber-card p-4 border border-dashed border-primary/30 hover:border-primary/50 transition-all">
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <Upload className="h-12 w-12 text-primary/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Upload Evaluation Dataset</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Upload a JSON or CSV file containing job descriptions and manually annotated keywords.
          See documentation for the required format.
        </p>
        
        {datasetSize > 25 && (
          <Alert className="mb-4 bg-yellow-500/10 border-yellow-600/30 text-left">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-xs">
              Due to API quota limitations, evaluation of large datasets will use a mix of AI and baseline algorithms.
              Some items may be processed using only the baseline algorithm.
            </AlertDescription>
          </Alert>
        )}
        
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
  );
};

export default FileUploadSection;
