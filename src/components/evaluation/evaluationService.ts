
import { EvaluationDataItem, EvaluationResult, KeywordItem, MetricsResult } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Simple baseline algorithm: extract most frequent non-stopwords
const extractBaselineKeywords = (text: string): KeywordItem[] => {
  try {
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

    if (!text || typeof text !== 'string') {
      console.warn("extractBaselineKeywords received invalid text:", text);
      return [];
    }

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
  } catch (error) {
    console.error("Error in extractBaselineKeywords:", error);
    return [];
  }
};

// Calculate precision, recall, F1 score
const calculateMetrics = (
  groundTruth: KeywordItem[],
  extracted: KeywordItem[]
): MetricsResult => {
  try {
    // Log inputs for debugging
    console.log("Calculating metrics with:", { 
      groundTruthCount: groundTruth?.length || 0, 
      extractedCount: extracted?.length || 0,
      groundTruthSample: groundTruth?.slice(0, 3) || [],
      extractedSample: extracted?.slice(0, 3) || []
    });
    
    // Ensure both arrays are valid
    if (!Array.isArray(groundTruth) || !Array.isArray(extracted)) {
      console.warn("calculateMetrics received invalid arrays:", { groundTruth, extracted });
      return { precision: 0, recall: 0, f1Score: 0, averageRankCorrelation: 0 };
    }
    
    // If either array is empty but not both, log a warning
    if ((groundTruth.length === 0 || extracted.length === 0) && !(groundTruth.length === 0 && extracted.length === 0)) {
      console.warn("One of the arrays is empty in calculateMetrics:", {
        groundTruthLength: groundTruth.length,
        extractedLength: extracted.length
      });
    }
    
    // Filter out invalid items
    const validGroundTruth = groundTruth
      .filter(item => item && typeof item === 'object' && typeof item.keyword === 'string' && item.keyword.trim() !== '');
    
    const validExtracted = extracted
      .filter(item => item && typeof item === 'object' && typeof item.keyword === 'string' && item.keyword.trim() !== '');

    console.log("Valid items after filtering:", {
      validGroundTruthCount: validGroundTruth.length,
      validExtractedCount: validExtracted.length
    });

    if (validGroundTruth.length === 0 && validExtracted.length === 0) {
      console.warn("Both arrays are empty after validation");
      return { precision: 0, recall: 0, f1Score: 0, averageRankCorrelation: 0 };
    }

    // Convert to lowercase sets for comparison
    const groundTruthSet = new Set(validGroundTruth.map(item => item.keyword.toLowerCase().trim()));
    const extractedSet = new Set(validExtracted.map(item => item.keyword.toLowerCase().trim()));

    console.log("Sets for comparison:", {
      groundTruthSetSize: groundTruthSet.size,
      extractedSetSize: extractedSet.size
    });

    // Find true positives (intersection)
    const truePositives = [...extractedSet].filter(keyword => groundTruthSet.has(keyword));
    
    console.log("True positives:", {
      count: truePositives.length,
      sample: truePositives.slice(0, 3)
    });
    
    // Calculate metrics
    const precision = extractedSet.size > 0 ? truePositives.length / extractedSet.size : 0;
    const recall = groundTruthSet.size > 0 ? truePositives.length / groundTruthSet.size : 0;
    const f1Score = precision + recall > 0 
      ? 2 * (precision * recall) / (precision + recall) 
      : 0;

    console.log("Calculated metrics:", { precision, recall, f1Score });

    // Simplified rank correlation (this could be improved with Spearman's rho)
    const averageRankCorrelation = 0; // Placeholder for a more complex implementation

    return { precision, recall, f1Score, averageRankCorrelation };
  } catch (error) {
    console.error("Error in calculateMetrics:", error);
    return { precision: 0, recall: 0, f1Score: 0, averageRankCorrelation: 0 };
  }
};

// Process a job description through our actual algorithm
const extractKeywordsWithAI = async (description: string): Promise<KeywordItem[]> => {
  try {
    if (!description || typeof description !== 'string') {
      console.warn("extractKeywordsWithAI received invalid description:", description);
      return [];
    }

    console.log("Calling edge function with description length:", description.length);

    // Call our actual Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
      body: { jobDescription: description }
    });

    if (error) {
      console.error('Error invoking edge function:', error);
      
      // Check if it's a quota error (429)
      if (error.message && error.message.includes('429')) {
        toast.error('API quota exceeded. Using baseline algorithm as fallback.', { 
          duration: 5000 
        });
        // Return baseline keywords on quota error
        return extractBaselineKeywords(description);
      }
      
      throw error;
    }

    console.log("Edge function response:", data);

    if (!data || !data.success || !Array.isArray(data.keywords)) {
      console.warn("Invalid response from edge function:", data);
      throw new Error(data?.error || 'Failed to extract keywords');
    }

    // Filter and validate keywords
    const keywords = (data.keywords || [])
      .filter(kw => kw && typeof kw === 'object' && typeof kw.keyword === 'string' && kw.keyword.trim() !== '')
      .map(kw => ({
        keyword: kw.keyword.trim(),
        frequency: typeof kw.frequency === 'number' ? kw.frequency : 1
      }));

    console.log("Extracted keywords with AI:", keywords.length);
    return keywords;
  } catch (error) {
    console.error('Error extracting keywords with AI:', error);
    // Fallback to baseline algorithm on error
    console.log('Using baseline algorithm as fallback');
    return extractBaselineKeywords(description);
  }
};

// Main evaluation function
export const runEvaluation = async (
  dataItems: EvaluationDataItem[]
): Promise<EvaluationResult> => {
  console.log("Starting evaluation with", dataItems.length, "items");
  
  // Validate input
  if (!Array.isArray(dataItems) || dataItems.length === 0) {
    console.error("No valid data items to evaluate:", dataItems);
    throw new Error("No valid data items to evaluate");
  }
  
  // Track if we're using fallback for all items
  let usingFallback = false;
  
  // Check if items exceed a reasonable limit to prevent quota issues
  if (dataItems.length > 20) {
    toast.warning('Large dataset detected. Using baseline algorithm for evaluation to prevent API quota issues.', {
      duration: 7000
    });
    usingFallback = true;
  }

  // Process each item
  const processedItems = await Promise.all(
    dataItems.map(async (item, index) => {
      try {
        console.log(`Processing item ${index + 1}/${dataItems.length}:`, {
          id: item?.id,
          descriptionLength: item?.description?.length,
          groundTruthCount: item?.groundTruth?.length
        });

        if (!item || typeof item !== 'object' || !item.description) {
          console.warn("Invalid item at index", index, item);
          throw new Error("Invalid item data");
        }

        // Validate ground truth data
        const validGroundTruth = Array.isArray(item.groundTruth) 
          ? item.groundTruth.filter(kw => 
              kw && 
              typeof kw === 'object' && 
              typeof kw.keyword === 'string' &&
              kw.keyword.trim() !== ''
            )
          : [];

        console.log(`Item ${index} has ${validGroundTruth.length} valid ground truth keywords`);

        // Use fallback for large datasets or every 3rd item to conserve quota
        const useBaselineForThis = usingFallback || index % 3 !== 0;
        
        // Get keywords from algorithm (AI or baseline)
        const extractedKeywords = useBaselineForThis
          ? extractBaselineKeywords(item.description)
          : await extractKeywordsWithAI(item.description);
        
        // Get keywords from baseline algorithm (always)
        const baselineKeywords = extractBaselineKeywords(item.description);

        console.log(`Item ${index} extracted keywords:`, {
          aiKeywords: extractedKeywords.length,
          baselineKeywords: baselineKeywords.length
        });

        // Calculate metrics
        const metrics = calculateMetrics(validGroundTruth, extractedKeywords);
        const baselineMetrics = calculateMetrics(validGroundTruth, baselineKeywords);

        console.log(`Item ${index} metrics:`, {
          ai: metrics,
          baseline: baselineMetrics
        });

        return {
          id: item.id || `item-${index}`,
          metrics,
          baselineMetrics,
          groundTruth: validGroundTruth,
          extractedKeywords,
          baselineKeywords,
          usingFallback: useBaselineForThis
        };
      } catch (error) {
        console.error(`Error processing item ${index}:`, error);
        // On error, use baseline keywords
        const baselineKeywords = extractBaselineKeywords(item.description || "");
        
        // Create fallback metrics
        const fallbackMetrics = { precision: 0, recall: 0, f1Score: 0, averageRankCorrelation: 0 };
        
        return {
          id: item.id || `item-${index}`,
          metrics: fallbackMetrics,
          baselineMetrics: fallbackMetrics,
          groundTruth: [],
          extractedKeywords: baselineKeywords,
          baselineKeywords,
          usingFallback: true
        };
      }
    })
  );

  // Filter out items that failed to process
  const validProcessedItems = processedItems.filter(item => item && typeof item === 'object');
  console.log(`Processed ${validProcessedItems.length} valid items out of ${dataItems.length} total`);

  // If no valid items, throw error
  if (validProcessedItems.length === 0) {
    console.error("No items could be successfully evaluated");
    throw new Error("No items could be successfully evaluated");
  }

  // If we're using fallback for everything, show a notification
  if (validProcessedItems.every(item => item.usingFallback)) {
    toast.warning('API quota exceeded. Evaluation completed using the baseline algorithm for all items.', {
      duration: 7000
    });
  } else if (validProcessedItems.some(item => item.usingFallback)) {
    toast.info('Some items were processed using the baseline algorithm due to API limitations.', {
      duration: 5000
    });
  }

  // Calculate overall metrics with more explicit checks
  const sum = (arr: number[]) => arr.reduce((acc, val) => acc + val, 0);
  const avg = (arr: number[]) => arr.length > 0 ? sum(arr) / arr.length : 0;
  
  const precisions = validProcessedItems.map(item => item.metrics?.precision || 0);
  const recalls = validProcessedItems.map(item => item.metrics?.recall || 0);
  const f1Scores = validProcessedItems.map(item => item.metrics?.f1Score || 0);
  
  const baselinePrecisions = validProcessedItems.map(item => item.baselineMetrics?.precision || 0);
  const baselineRecalls = validProcessedItems.map(item => item.baselineMetrics?.recall || 0);
  const baselineF1Scores = validProcessedItems.map(item => item.baselineMetrics?.f1Score || 0);
  
  const overallPrecision = avg(precisions);
  const overallRecall = avg(recalls);
  const overallF1 = avg(f1Scores);
  
  const baselinePrecision = avg(baselinePrecisions);
  const baselineRecall = avg(baselineRecalls);
  const baselineF1 = avg(baselineF1Scores);

  console.log("Overall metrics:", {
    ai: { precision: overallPrecision, recall: overallRecall, f1Score: overallF1 },
    baseline: { precision: baselinePrecision, recall: baselineRecall, f1Score: baselineF1 }
  });

  // Return the final results
  return {
    overall: {
      precision: overallPrecision,
      recall: overallRecall,
      f1Score: overallF1,
      averageRankCorrelation: 0
    },
    baseline: {
      precision: baselinePrecision,
      recall: baselineRecall,
      f1Score: baselineF1,
      averageRankCorrelation: 0
    },
    perItem: validProcessedItems
  };
};
