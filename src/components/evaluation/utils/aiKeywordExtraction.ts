
import { KeywordItem } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractBaselineKeywords } from "./baselineAlgorithm";

// Process a job description through our actual algorithm
export const extractKeywordsWithAI = async (description: string): Promise<KeywordItem[]> => {
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
