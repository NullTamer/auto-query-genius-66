import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, BarChart, FileSpreadsheet } from "lucide-react";
import { EvaluationResult } from "../types";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ExportResultsProps {
  results: EvaluationResult;
}

const ExportResults: React.FC<ExportResultsProps> = ({ results }) => {
  const [copied, setCopied] = useState(false);

  const exportAsJSON = () => {
    if (!results) {
      toast.error("No results to export");
      return;
    }

    try {
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
      
      const jsonString = JSON.stringify(exportData, null, 2);
      
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluation-results-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      
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
      const headers = ["Metric", "Overall", "Baseline"];
      
      const rows = [
        ["Precision", results.overall.precision, results.baseline.precision],
        ["Recall", results.overall.recall, results.baseline.recall],
        ["F1 Score", results.overall.f1Score, results.baseline.f1Score]
      ];
      
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
      
      const allRows = [headers, ...rows, [""], ["Per-Item Results"], ...itemRows];
      
      const csvContent = allRows
        .map(row => {
          return row.map(cell => {
            if (typeof cell === 'number') {
              return (cell * 100).toFixed(2) + '%';
            }
            if (typeof cell === 'string' && cell.includes(',')) {
              return `"${cell}"`;
            }
            return cell;
          }).join(',');
        })
        .join('\n');
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `evaluation-results-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Results exported as CSV");
    } catch (error) {
      console.error("Error exporting as CSV:", error);
      toast.error("Failed to export results as CSV");
    }
  };

  const exportAcademicReport = () => {
    if (!results) {
      toast.error("No results to export");
      return;
    }

    try {
      const overallPrecision = (results.overall.precision * 100).toFixed(2);
      const overallRecall = (results.overall.recall * 100).toFixed(2);
      const overallF1 = (results.overall.f1Score * 100).toFixed(2);
      
      const baselinePrecision = (results.baseline.precision * 100).toFixed(2);
      const baselineRecall = (results.baseline.recall * 100).toFixed(2);
      const baselineF1 = (results.baseline.f1Score * 100).toFixed(2);
      
      const improvementPrecision = ((results.overall.precision - results.baseline.precision) / results.baseline.precision * 100).toFixed(2);
      const improvementRecall = ((results.overall.recall - results.baseline.recall) / results.baseline.recall * 100).toFixed(2);
      const improvementF1 = ((results.overall.f1Score - results.baseline.f1Score) / results.baseline.f1Score * 100).toFixed(2);
      
      const reportContent = `
# Evaluation Report: Automated Search Strategy Generation
Date: ${new Date().toLocaleDateString()}

## Executive Summary
This report presents the performance evaluation of an automated search strategy generation algorithm. 
The algorithm was tested against a baseline approach using a dataset of job descriptions and reference search terms.

## Methodology
The evaluation was conducted using precision, recall, and F1 score metrics, which are standard in information retrieval evaluation.
- **Precision**: Percentage of extracted keywords that are relevant
- **Recall**: Percentage of relevant keywords that were successfully extracted
- **F1 Score**: Harmonic mean of precision and recall

## Results Overview

### Core Metrics
| Metric | Algorithm | Baseline | Improvement |
|--------|-----------|----------|-------------|
| Precision | ${overallPrecision}% | ${baselinePrecision}% | ${improvementPrecision}% |
| Recall | ${overallRecall}% | ${baselineRecall}% | ${improvementRecall}% |
| F1 Score | ${overallF1}% | ${baselineF1}% | ${improvementF1}% |

${results.advanced ? `
### Advanced Statistical Analysis
- **Mean Precision**: ${(results.advanced.mean.precision * 100).toFixed(2)}%
- **Median Precision**: ${(results.advanced.median.precision * 100).toFixed(2)}%
- **Standard Deviation**: ${(results.advanced.stdDev.precision * 100).toFixed(2)}%
- **Min Precision**: ${(results.advanced.min.precision * 100).toFixed(2)}%
- **Max Precision**: ${(results.advanced.max.precision * 100).toFixed(2)}%
` : ''}

## Dataset Characteristics
- **Total Items**: ${results.perItem.length}
- **Average Ground Truth Terms**: ${(results.perItem.reduce((acc, item) => acc + (item.groundTruth?.length || 0), 0) / results.perItem.length).toFixed(1)}
- **Average Extracted Terms**: ${(results.perItem.reduce((acc, item) => acc + (item.extractedKeywords?.length || 0), 0) / results.perItem.length).toFixed(1)}

## Discussion
The implemented algorithm shows ${Number(improvementF1) > 0 ? 'an improvement' : 'a decrease'} of ${Math.abs(Number(improvementF1))}% in F1 score compared to the baseline approach.
${Number(improvementF1) > 5 ? 'This significant improvement indicates that our approach effectively captures relevant keywords and structures them in a way that balances precision and recall.' : 
'The results suggest that further refinement of the algorithm may be needed to achieve more substantial improvements over the baseline.'}

## Conclusion
${Number(improvementF1) > 0 ? 
'The evaluation demonstrates that our automated search strategy generation approach outperforms the baseline method in terms of identifying relevant search terms from job descriptions.' :
'While the current implementation shows promising directions, more sophisticated natural language processing techniques may be required to significantly outperform the baseline method.'}

## Next Steps
1. Refine keyword extraction using domain-specific knowledge
2. Implement more sophisticated query structuring algorithms
3. Test with a larger and more diverse dataset
4. Incorporate user feedback to improve query relevance
`;

      const blob = new Blob([reportContent], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `academic-report-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Academic report generated");
    } catch (error) {
      console.error("Error generating academic report:", error);
      toast.error("Failed to generate academic report");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsJSON}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAcademicReport}>
          <BarChart className="h-4 w-4 mr-2" />
          Generate Academic Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportResults;
