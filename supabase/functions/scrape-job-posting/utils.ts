
// Temporary keyword extraction function that doesn't rely on Gemini
export async function extractKeywords(jobDescription: string) {
  // Simple implementation that extracts words that appear frequently
  const text = jobDescription.toLowerCase();
  
  // Remove common punctuation and split into words
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3); // Only consider words longer than 3 characters
  
  // Count word frequency
  const wordFrequency: Record<string, number> = {};
  words.forEach(word => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  
  // Filter out common words
  const commonWords = [
    'the', 'and', 'for', 'with', 'that', 'have', 'this', 'will', 'your', 'from',
    'they', 'work', 'what', 'about', 'which', 'their', 'there', 'more', 'when',
    'experience', 'our', 'team', 'role', 'skills', 'working', 'position', 'able'
  ];
  
  // Create an array of keyword objects sorted by frequency
  const keywords = Object.entries(wordFrequency)
    .filter(([word, _]) => !commonWords.includes(word))
    .map(([keyword, frequency]) => ({ keyword, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 25); // Take the top 25 keywords
  
  return keywords;
}
