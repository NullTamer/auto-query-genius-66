
import { MetricsResult, AdvancedMetricsResult } from "../types";

// Calculate median of an array of numbers
export const calculateMedian = (values: number[]): number => {
  if (!values || values.length === 0) return 0;
  
  // Sort the array
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

// Calculate standard deviation
export const calculateStdDev = (values: number[], mean: number): number => {
  if (!values || values.length <= 1) return 0;
  
  const sumOfSquaredDifferences = values.reduce((sum, value) => {
    const diff = value - mean;
    return sum + (diff * diff);
  }, 0);
  
  return Math.sqrt(sumOfSquaredDifferences / values.length);
};

// Find minimum value in array
export const findMin = (values: number[]): number => {
  if (!values || values.length === 0) return 0;
  return Math.min(...values);
};

// Find maximum value in array
export const findMax = (values: number[]): number => {
  if (!values || values.length === 0) return 0;
  return Math.max(...values);
};

// Calculate all advanced metrics from an array of MetricsResult
export const calculateAdvancedMetrics = (
  metricsArray: MetricsResult[]
): AdvancedMetricsResult => {
  if (!metricsArray || metricsArray.length === 0) {
    // Return default values if no data
    const defaultMetrics = { precision: 0, recall: 0, f1Score: 0, averageRankCorrelation: 0 };
    return {
      mean: defaultMetrics,
      median: defaultMetrics,
      stdDev: defaultMetrics,
      min: defaultMetrics,
      max: defaultMetrics
    };
  }
  
  // Extract arrays of each metric
  const precisions = metricsArray.map(m => m.precision || 0);
  const recalls = metricsArray.map(m => m.recall || 0);
  const f1Scores = metricsArray.map(m => m.f1Score || 0);
  const rankCorrelations = metricsArray
    .filter(m => m.averageRankCorrelation !== undefined)
    .map(m => m.averageRankCorrelation || 0);
  
  // Calculate means (already done in the parent function)
  const meanPrecision = precisions.reduce((sum, val) => sum + val, 0) / precisions.length;
  const meanRecall = recalls.reduce((sum, val) => sum + val, 0) / recalls.length;
  const meanF1 = f1Scores.reduce((sum, val) => sum + val, 0) / f1Scores.length;
  const meanRankCorr = rankCorrelations.length > 0
    ? rankCorrelations.reduce((sum, val) => sum + val, 0) / rankCorrelations.length
    : 0;
  
  // Calculate medians
  const medianPrecision = calculateMedian(precisions);
  const medianRecall = calculateMedian(recalls);
  const medianF1 = calculateMedian(f1Scores);
  const medianRankCorr = calculateMedian(rankCorrelations);
  
  // Calculate standard deviations
  const stdDevPrecision = calculateStdDev(precisions, meanPrecision);
  const stdDevRecall = calculateStdDev(recalls, meanRecall);
  const stdDevF1 = calculateStdDev(f1Scores, meanF1);
  const stdDevRankCorr = calculateStdDev(rankCorrelations, meanRankCorr);
  
  // Calculate min
  const minPrecision = findMin(precisions);
  const minRecall = findMin(recalls);
  const minF1 = findMin(f1Scores);
  const minRankCorr = findMin(rankCorrelations);
  
  // Calculate max
  const maxPrecision = findMax(precisions);
  const maxRecall = findMax(recalls);
  const maxF1 = findMax(f1Scores);
  const maxRankCorr = findMax(rankCorrelations);
  
  return {
    mean: {
      precision: meanPrecision,
      recall: meanRecall,
      f1Score: meanF1,
      averageRankCorrelation: meanRankCorr
    },
    median: {
      precision: medianPrecision,
      recall: medianRecall,
      f1Score: medianF1,
      averageRankCorrelation: medianRankCorr
    },
    stdDev: {
      precision: stdDevPrecision,
      recall: stdDevRecall,
      f1Score: stdDevF1,
      averageRankCorrelation: stdDevRankCorr
    },
    min: {
      precision: minPrecision,
      recall: minRecall,
      f1Score: minF1,
      averageRankCorrelation: minRankCorr
    },
    max: {
      precision: maxPrecision,
      recall: maxRecall,
      f1Score: maxF1,
      averageRankCorrelation: maxRankCorr
    }
  };
};
