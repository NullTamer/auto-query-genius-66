
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") || "");

/**
 * Extract keywords from a job description using a fallback method when Gemini is unavailable
 */
export async function extractKeywordsWithFallback(jobDescription: string) {
  try {
    console.log("Attempting to extract keywords from job description");
    
    // First try to use Gemini
    try {
      return await extractKeywordsWithGemini(jobDescription);
    } catch (geminiError) {
      console.error("Gemini API error, using fallback method:", geminiError.message);
      return extractKeywordsWithBasicMethod(jobDescription);
    }
  } catch (error) {
    console.error("Error extracting keywords:", error);
    throw new Error(`Failed to extract keywords: ${error.message}`);
  }
}

/**
 * Uses Gemini API to extract keywords from a job description
 */
async function extractKeywordsWithGemini(jobDescription: string) {
  try {
    // Use the correct model name for Gemini
    // Important: The model name might need to be updated based on the latest Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Prepare the prompt for keyword extraction
    const prompt = `
    Extract the most important keywords from this job description. 
    Focus on technical skills, tools, programming languages, frameworks, methodologies, and required qualifications.
    For each keyword, include a frequency score (1-10) based on its importance and repetition in the description.
    Format your response as a valid JSON array with objects containing "keyword" and "frequency" properties.
    Example: [{"keyword": "React", "frequency": 8}, {"keyword": "JavaScript", "frequency": 7}]
    
    Here is the job description:
    ${jobDescription}
    `;

    // Generate content from Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract the JSON array from the response
    const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
    if (!jsonMatch) {
      console.warn("No valid JSON found in Gemini response, using fallback method");
      return extractKeywordsWithBasicMethod(jobDescription);
    }

    const jsonStr = jsonMatch[0];
    const keywords = JSON.parse(jsonStr);
    console.log(`Successfully extracted ${keywords.length} keywords using Gemini`);
    
    return keywords;
  } catch (error) {
    console.error("Error extracting keywords with Gemini:", error);
    throw error;
  }
}

/**
 * Extracts keywords using a simple regex-based approach as fallback
 */
function extractKeywordsWithBasicMethod(jobDescription: string) {
  console.log("Using basic method to extract keywords");
  
  // Common tech skills, languages, and frameworks to look for
  const techTerms = [
    "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js", "Express", 
    "Python", "Django", "Flask", "Java", "Spring", "C#", ".NET", "PHP", "Laravel",
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "AWS", "Azure", "GCP",
    "Docker", "Kubernetes", "CI/CD", "Git", "RESTful", "API", "GraphQL",
    "HTML", "CSS", "SASS", "LESS", "Tailwind", "Bootstrap", "Material UI",
    "React Native", "Flutter", "iOS", "Android", "Swift", "Kotlin",
    "Data Science", "Machine Learning", "AI", "Artificial Intelligence",
    "Agile", "Scrum", "Kanban", "DevOps", "TDD", "BDD"
  ];
  
  // Extract terms that appear in the job description
  const foundTerms = new Map();
  
  // Case insensitive search for each term
  techTerms.forEach(term => {
    const regex = new RegExp(`\\b${term.replace(/\./g, '\\.')}\\b`, 'gi');
    const matches = jobDescription.match(regex);
    if (matches && matches.length > 0) {
      // Calculate frequency score (1-10) based on occurrence count
      const frequency = Math.min(10, Math.max(1, Math.ceil(matches.length / 2)));
      foundTerms.set(term, frequency);
    }
  });
  
  // Look for additional capitalized terms that might be technologies or skills
  const capitalizedWords = jobDescription.match(/\b[A-Z][a-zA-Z]+\b/g) || [];
  capitalizedWords.forEach(word => {
    if (word.length > 2 && !techTerms.includes(word)) {
      foundTerms.set(word, 3); // Default frequency
    }
  });
  
  // Convert to array of objects
  const keywords = Array.from(foundTerms).map(([keyword, frequency]) => ({
    keyword,
    frequency
  }));
  
  console.log(`Extracted ${keywords.length} keywords using basic method`);
  return keywords;
}

/**
 * Extracts text from a PDF using a basic approach
 */
export function extractTextFromPDF(pdfArrayBuffer: ArrayBuffer): string {
  // In a real implementation, this would use PDF.js or similar
  // For now, return a placeholder message
  console.log("PDF extraction requested, using placeholder text");
  return "This is placeholder text extracted from the PDF. The actual implementation would use a PDF parsing library.";
}
