
/**
 * Extract keywords from job description text
 */
export const extractKeywords = async (text: string): Promise<Array<{ keyword: string, frequency: number }>> => {
  try {
    // Simple keyword extraction logic - this could be enhanced with AI or NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
      .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
      .split(' ')
      .filter(word => word.length > 2);  // Filter out short words
    
    // Count word frequency
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      if (!wordCounts[word]) {
        wordCounts[word] = 0;
      }
      wordCounts[word]++;
    });
    
    // Convert to array and sort by frequency
    const keywords = Object.entries(wordCounts)
      .map(([keyword, frequency]) => ({ keyword, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 25);  // Limit to top 25 keywords
    
    return keywords;
  } catch (error) {
    console.error('Error extracting keywords:', error);
    return [];
  }
};
