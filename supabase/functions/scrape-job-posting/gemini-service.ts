
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

// Initialize the Gemini API with the API key
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Function to extract keywords using Gemini AI
export async function extractKeywordsWithGemini(text: string): Promise<{ keyword: string, frequency: number }[]> {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set");
    return extractKeywordsWithFallback(text);
  }

  try {
    console.log(`Extracting keywords from text (length: ${text.length})`);
    
    // Trim text if it's too long (Gemini has input limits)
    const MAX_TEXT_LENGTH = 30000;
    const trimmedText = text.length > MAX_TEXT_LENGTH 
      ? text.substring(0, MAX_TEXT_LENGTH) 
      : text;
    
    // Initialize the Gemini AI API
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    // Get the model - use gemini-1.5-pro instead of gemini-pro
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Create the prompt for keyword extraction
    const prompt = `
    Extract the most important technical skills, technologies, job titles, and qualifications from the following job description.
    For each keyword, provide a frequency score from 1 to 10 based on importance and repetition.
    Format the response as a JSON array of objects with 'keyword' and 'frequency' properties.
    Example format: [{"keyword": "JavaScript", "frequency": 8}, {"keyword": "React", "frequency": 7}]
    
    Job Description:
    ${trimmedText}
    
    Only respond with the JSON array, no other text.
    `;
    
    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Raw Gemini response:", text.substring(0, 200) + "...");
    
    // Extract the JSON array from the response
    try {
      // Find JSON content within the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const keywords = JSON.parse(jsonStr);
        
        // Validate the structure
        if (Array.isArray(keywords) && keywords.every(k => k.keyword && typeof k.frequency === 'number')) {
          console.log(`Successfully extracted ${keywords.length} keywords with Gemini`);
          return keywords;
        } else {
          console.error("Invalid keywords structure from Gemini");
          return extractKeywordsWithFallback(trimmedText);
        }
      } else {
        console.error("No JSON array found in Gemini response");
        return extractKeywordsWithFallback(trimmedText);
      }
    } catch (parseError) {
      console.error("Error parsing keywords from Gemini response:", parseError);
      return extractKeywordsWithFallback(trimmedText);
    }
  } catch (error) {
    console.error("Error extracting keywords with Gemini:", error);
    throw error;
  }
}

// Fallback function for keyword extraction when Gemini fails
export function extractKeywordsWithFallback(text: string): { keyword: string, frequency: number }[] {
  console.log("Using fallback keyword extraction method");
  
  // List of common tech skills to look for
  const commonSkills = [
    "JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "Ruby", "PHP", "Go", "Swift",
    "React", "Angular", "Vue", "Next.js", "Node.js", "Express", "Django", "Flask", "Spring", "Rails",
    "SQL", "NoSQL", "MongoDB", "PostgreSQL", "MySQL", "Redis", "AWS", "Azure", "GCP", "Docker",
    "Kubernetes", "CI/CD", "Git", "DevOps", "Agile", "Scrum", "REST", "GraphQL", "HTML", "CSS",
    "Tailwind", "Bootstrap", "SASS", "LESS", "Redux", "Mobx", "Jest", "Mocha", "Cypress", "Selenium",
    "TDD", "BDD", "UI/UX", "Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator", "InDesign",
    "Product Manager", "Project Manager", "Scrum Master", "Tech Lead", "Architect", "Engineer",
    "Developer", "Programmer", "Analyst", "Consultant", "Designer", "Tester", "QA", "DBA", "SRE",
    "DevSecOps", "Machine Learning", "AI", "Data Science", "Big Data", "Hadoop", "Spark", "Kafka",
    "ETL", "Business Intelligence", "Tableau", "Power BI", "Excel", "VBA", "R", "MATLAB", "Scala"
  ];
  
  // Common job titles
  const jobTitles = [
    "Software Engineer", "Front End Developer", "Back End Developer", "Full Stack Developer",
    "DevOps Engineer", "Site Reliability Engineer", "Data Scientist", "Data Engineer",
    "Machine Learning Engineer", "AI Engineer", "Cloud Architect", "Solutions Architect",
    "Product Manager", "Project Manager", "Scrum Master", "Tech Lead", "Engineering Manager",
    "CTO", "VP of Engineering", "Director of Engineering", "UX Designer", "UI Designer",
    "Graphic Designer", "QA Engineer", "Test Engineer", "Business Analyst", "Systems Analyst"
  ];
  
  // Combine all search terms
  const searchTerms = [...commonSkills, ...jobTitles];
  
  // Count occurrences of each term
  const counts = new Map<string, number>();
  
  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Search for each term and count occurrences
  searchTerms.forEach(term => {
    // Create a regex pattern that matches the term as a whole word
    const pattern = new RegExp(`\\b${term.toLowerCase()}\\b`, 'gi');
    const matches = lowerText.match(pattern);
    if (matches && matches.length > 0) {
      counts.set(term, matches.length);
    }
  });
  
  // Convert to array and sort by occurrence count
  const keywordArray = Array.from(counts.entries())
    .map(([keyword, count]) => ({
      keyword,
      // Map the raw count to a frequency score between 1 and 10
      frequency: Math.min(10, Math.max(1, Math.ceil(count * 2)))
    }))
    .sort((a, b) => b.frequency - a.frequency);
  
  // If we found keywords, return them
  if (keywordArray.length > 0) {
    console.log(`Extracted ${keywordArray.length} keywords with fallback method`);
    return keywordArray;
  }
  
  // If no keywords were found, provide some default keywords based on text length
  if (text.length > 0) {
    // Extract words from the text that might be important
    const words = text.split(/\s+/)
      .map(word => word.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(word => word.length > 4)  // Only consider words with 5+ characters
      .filter(word => !['about', 'these', 'their', 'there', 'which', 'would'].includes(word.toLowerCase()));
    
    // Count word frequencies
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      const count = wordCounts.get(word) || 0;
      wordCounts.set(word, count + 1);
    });
    
    // Get top 10 most frequent words
    const topWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({
        keyword: word,
        frequency: Math.min(10, Math.max(1, Math.ceil(count)))
      }));
    
    if (topWords.length > 0) {
      console.log(`Extracted ${topWords.length} keywords from text analysis`);
      return topWords;
    }
  }
  
  // Last resort: return some generic placeholder keywords
  console.log("Using placeholder keywords as fallback");
  return [
    { keyword: "Programmer", frequency: 10 },
    { keyword: "Developer", frequency: 8 },
    { keyword: "Software", frequency: 7 },
    { keyword: "Technology", frequency: 6 },
    { keyword: "Computer", frequency: 5 }
  ];
}
