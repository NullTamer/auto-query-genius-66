
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers - this is critical for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Keyword = {
  keyword: string;
  frequency: number;
};

// Simple function to extract keywords from job description
function extractKeywords(text: string): Keyword[] {
  // Simple implementation that extracts words that appear frequently
  const processedText = text.toLowerCase();
  
  // Remove common punctuation and split into words
  const words = processedText
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jobDescription } = body;
    
    if (!jobDescription || typeof jobDescription !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid job description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing job posting: ${jobDescription.slice(0, 100)}...`);
    
    // Generate a fake job ID (in a real app, this would be a database ID)
    const jobId = Math.floor(Math.random() * 10000);
    
    // Extract keywords using simple function
    const extractedKeywords = extractKeywords(jobDescription);
    console.log(`Extracted ${extractedKeywords.length} keywords`);
    
    // Return both the job ID and the extracted keywords
    return new Response(
      JSON.stringify({ 
        id: jobId,
        keywords: extractedKeywords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error processing job posting:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
