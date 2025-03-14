
import { KeywordItem } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractBaselineKeywords } from "./baselineAlgorithm";

// Process a job description through our algorithm
export const extractKeywordsWithAI = async (description: string): Promise<KeywordItem[]> => {
  try {
    if (!description || typeof description !== 'string') {
      console.warn("extractKeywordsWithAI received invalid description:", description);
      return [];
    }

    // For a school project, using the baseline algorithm as primary method
    // to avoid requiring paid API keys
    console.log("Using baseline algorithm for keyword extraction");
    return extractBaselineKeywords(description);

    // The edge function with Perplexity API is disabled for this school project
    // If you want to use the AI approach later, uncomment the below code:
    /*
    console.log("Calling edge function with description length:", description.length);

    // Call our Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('scrape-job-posting', {
      body: { jobDescription: description }
    });

    if (error) {
      console.error('Error invoking edge function:', error);
      
      // Check for specific network errors
      const errorMessage = error.message || '';
      
      // Network errors to look for
      if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
        const networkError = 'Network request blocked by browser. Try disabling content blockers or privacy extensions.';
        console.error(networkError);
        toast.error(networkError, { duration: 8000 });
        throw new Error(networkError);
      }
      
      // Check if it's a quota error (429)
      if (errorMessage.includes('429')) {
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
    */
  } catch (error) {
    console.error('Error extracting keywords:', error);
    // Fallback to baseline algorithm
    return extractBaselineKeywords(description);
  }
};
