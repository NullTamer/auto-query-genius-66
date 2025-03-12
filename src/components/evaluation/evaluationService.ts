
import { EvaluationDataItem, EvaluationResult, KeywordItem, MetricsResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

// Simple baseline algorithm: extract most frequent non-stopwords
const extractBaselineKeywords = (text: string): KeywordItem[] => {
  // Common English stopwords
  const stopwords = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at", "be", "because", 
    "been", "before", "being", "below", "between", "both", "but", "by", "could", "did", "do", "does", "doing", "down", "during", 
    "each", "few", "for", "from", "further", "had", "has", "have", "having", "he", "he'd", "he'll", "he's", "her", "here", 
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", 
    "is", "it", "it's", "its", "itself", "let's", "me", "more", "most", "my", "myself", "nor", "of", "on", "once", "only", "or", 
    "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "she'd", "she'll", "she's", "should", 
    "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", 
    "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", 
    "very", "was", "we", "we'd", "we'll", "we're", "we've", "were", "what", "what's", "when", "when's", "where", "where's", 
    "which", "while", "who", "who's", "whom", "why", "why's", "with", "would", "you", "you'd", "you'll", "you're", "you've", 
    "your", "yours", "yourself", "yourselves"
  ]);

  // Tokenize and clean text
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
    .split(/\s+/)              // Split on whitespace
    .filter(word => word.length > 2 && !stopwords.has(word));  // Remove stopwords and short words

  // Count word frequencies
  const wordCounts: Record<string, number> = {};
  tokens.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  // Convert to array, sort by frequency, and take top 15
  return Object.entries(wordCounts)
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 15);
};

// Calculate precision, recall, F1 score
const calculateMetrics = (
  groundTruth: KeywordItem[],
  extracted: KeywordItem[]
): MetricsResult => {
  const groundTruthSet = new Set(groundTruth.map(item => item.keyword.toLowerCase()));
  const extractedSet = new Set(extracted.map(item => item.keyword.toLowerCase()));

  // Find true positives
  const truePositives = [...extractedSet].filter(keyword => groundTruthSet.has(keyword));
  
  // Calculate metrics
  const precision = extractedSet.size > 0 ? truePositives.length / extractedSet.size : 0;
  const recall = groundTruthSet.size > 0 ? truePositives.length / groundTruthSet.size : 0;
  const f1Score = precision + recall > 0 
    ? 2 * (precision * recall) / (precision + recall) 
    : 0;

  // Simplified rank correlation (this could be improved with Spearman's rho)
  const averageRankCorrelation = 0; // Placeholder for a more complex implementation

  return { precision, recall, f1Score, averageRankCorrelation };
};

// Process a job description through our actual algorithm
const extractKeywordsWithAI = async (description: string): Promise<KeywordItem[]> => {
  try {
    // Call our actual Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
      body: { jobDescription: description }
    });

    if (error) {
      console.error('Error invoking edge function:', error);
      throw error;
    }

    if (!data.success || !data.keywords) {
      throw new Error(data.error || 'Failed to extract keywords');
    }

    return data.keywords;
  } catch (error) {
    console.error('Error extracting keywords with AI:', error);
    return []; // Return empty array on error
  }
};

// Main evaluation function
export const runEvaluation = async (
  dataItems: EvaluationDataItem[]
): Promise<EvaluationResult> => {
  // Process each item
  const processedItems = await Promise.all(
    dataItems.map(async (item) => {
      // Get keywords from our AI algorithm
      const extractedKeywords = await extractKeywordsWithAI(item.description);
      
      // Get keywords from baseline algorithm
      const baselineKeywords = extractBaselineKeywords(item.description);

      // Calculate metrics
      const metrics = calculateMetrics(item.groundTruth, extractedKeywords);
      const baselineMetrics = calculateMetrics(item.groundTruth, baselineKeywords);

      return {
        ...item,
        extractedKeywords,
        baselineKeywords,
        metrics,
        baselineMetrics
      };
    })
  );

  // Calculate overall metrics
  const overallPrecision = processedItems.reduce((sum, item) => sum + item.metrics.precision, 0) / processedItems.length;
  const overallRecall = processedItems.reduce((sum, item) => sum + item.metrics.recall, 0) / processedItems.length;
  const overallF1 = processedItems.reduce((sum, item) => sum + item.metrics.f1Score, 0) / processedItems.length;

  // Calculate overall baseline metrics
  const baselinePrecision = processedItems.reduce((sum, item) => sum + item.baselineMetrics.precision, 0) / processedItems.length;
  const baselineRecall = processedItems.reduce((sum, item) => sum + item.baselineMetrics.recall, 0) / processedItems.length;
  const baselineF1 = processedItems.reduce((sum, item) => sum + item.baselineMetrics.f1Score, 0) / processedItems.length;

  return {
    overall: {
      precision: overallPrecision,
      recall: overallRecall,
      f1Score: overallF1,
      averageRankCorrelation: 0 // Placeholder
    },
    baseline: {
      precision: baselinePrecision,
      recall: baselineRecall,
      f1Score: baselineF1,
      averageRankCorrelation: 0 // Placeholder
    },
    perItem: processedItems.map(item => ({
      id: item.id,
      metrics: item.metrics,
      groundTruth: item.groundTruth,
      extractedKeywords: item.extractedKeywords || [],
      baselineKeywords: item.baselineKeywords || []
    }))
  };
};
