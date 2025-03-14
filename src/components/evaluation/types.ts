
export interface EvaluationDataItem {
  id: string | number;
  description: string;
  groundTruth: KeywordItem[];
  extractedKeywords?: KeywordItem[];
  baselineKeywords?: KeywordItem[];
}

export interface KeywordItem {
  keyword: string;
  frequency: number;
  category?: string;
}

export interface MetricsResult {
  precision: number;
  recall: number;
  f1Score: number;
  averageRankCorrelation?: number;
}

export interface AdvancedMetricsResult {
  mean: MetricsResult;
  median: MetricsResult;
  stdDev: MetricsResult;
  min: MetricsResult;
  max: MetricsResult;
}

export interface EvaluationResult {
  overall: MetricsResult;
  advanced?: AdvancedMetricsResult;
  perItem: {
    id: string | number;
    metrics: MetricsResult;
    groundTruth: KeywordItem[];
    extractedKeywords: KeywordItem[];
    baselineKeywords: KeywordItem[];
    error?: string | null;
  }[];
  baseline: MetricsResult;
  error?: string | null;
}
