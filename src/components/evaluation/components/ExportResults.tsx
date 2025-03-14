
import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { EvaluationResult } from "../types";
import { toast } from "sonner";

interface ExportResultsProps {
  results: EvaluationResult;
}

const ExportResults: React.FC<ExportResultsProps> = ({ results }) => {
  const exportAsJSON = () => {
    if (!results) {
      toast.error("No results to export");
      return;
    }

    try {
      // Create a formatted object with relevant data
      const exportData = {
        overall: results.overall,
        baseline: results.baseline,
        advanced: results.advanced || null,
        items: results.perItem.map(item => ({
          id: item.id,
          metrics: item.metrics,
          groundTruthCount: item.groundTruth?.length || 0,
          extractedKeywordsCount: item.extractedKeywords?.length || 0,
          baselineKeywordsCount: item.baselineKeywords?.length || 0
        }))
      };
      
      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluation-results-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Results exported as JSON");
    } catch (error) {
      console.error("Error exporting results:", error);
      toast.error("Failed to export results");
    }
  };

  const exportAsCSV = () => {
    if (!results) {
      toast.error("No results to export");
      return;
    }

    try {
      // Create CSV content
      const headers = ["Metric", "Overall", "Baseline"];
      
      const rows = [
        ["Precision", results.overall.precision, results.baseline.precision],
        ["Recall", results.overall.recall, results.baseline.recall],
        ["F1 Score", results.overall.f1Score, results.baseline.f1Score]
      ];
      
      // Add advanced metrics if available
      if (results.advanced) {
        headers.push("Mean", "Median", "StdDev", "Min", "Max");
        
        rows[0].push(
          results.advanced.mean.precision,
          results.advanced.median.precision,
          results.advanced.stdDev.precision,
          results.advanced.min.precision,
          results.advanced.max.precision
        );
        
        rows[1].push(
          results.advanced.mean.recall,
          results.advanced.median.recall,
          results.advanced.stdDev.recall,
          results.advanced.min.recall,
          results.advanced.max.recall
        );
        
        rows[2].push(
          results.advanced.mean.f1Score,
          results.advanced.median.f1Score,
          results.advanced.stdDev.f1Score,
          results.advanced.min.f1Score,
          results.advanced.max.f1Score
        );
      }
      
      // Add per-item data
      const itemRows = results.perItem.map((item, index) => {
        return [
          `Item ${index + 1}`,
          item.metrics.precision,
          "", // No baseline per item
          "", // No mean
          "", // No median
          "", // No stddev
          "", // No min
          ""  // No max
        ];
      });
      
      // Combine all rows
      const allRows = [headers, ...rows, [""], ["Per-Item Results"], ...itemRows];
      
      // Convert to CSV
      const csvContent = allRows
        .map(row => {
          return row.map(cell => {
            // Format numbers as percentages with 2 decimal places
            if (typeof cell === 'number') {
              return (cell * 100).toFixed(2) + '%';
            }
            // Add quotes around strings that contain commas
            if (typeof cell === 'string' && cell.includes(',')) {
              return `"${cell}"`;
            }
            return cell;
          }).join(',');
        })
        .join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluation-results-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Results exported as CSV");
    } catch (error) {
      console.error("Error exporting as CSV:", error);
      toast.error("Failed to export results as CSV");
    }
  };

  return (
    <div className="flex gap-2 justify-end mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={exportAsJSON}
        className="flex items-center gap-1"
      >
        <Download className="h-4 w-4" />
        Export JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportAsCSV}
        className="flex items-center gap-1"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
};

export default ExportResults;
