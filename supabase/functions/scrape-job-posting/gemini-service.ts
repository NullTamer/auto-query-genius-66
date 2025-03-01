
import { sanitizeText } from "./utils.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const MODEL = 'gemini-1.5-flash';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export async function extractKeywords(jobDescription: string) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const sanitizedJobDescription = sanitizeText(jobDescription);
  const shortDescription = sanitizedJobDescription.substring(0, 20000); // Limit to 20k chars for safety

  const prompt = `
  You are a keyword extraction tool that specializes in analyzing job descriptions and extracting the most relevant keywords.
  
  Please analyze the following job description and extract the most relevant keywords that would be useful for a job seeker when creating a Boolean search query. Focus on technical skills, tools, technologies, qualifications, and required experience.
  
  Job Description:
  ${shortDescription}
  
  Format your response as a JSON array of objects, with each object having a "keyword" and a "frequency" property. The frequency should be based on how often the keyword appears and how important it seems to the role, on a scale from 1-5.
  
  For example:
  [
    {"keyword": "JavaScript", "frequency": 5},
    {"keyword": "React", "frequency": 4},
    ...
  ]
  
  ONLY return the JSON array, without any additional explanation or commentary.
  `;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Gemini API request attempt ${attempt} of ${MAX_RETRIES}`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Gemini API error: ${response.status}`, errorData);
        
        // Handle rate limiting (429) or server errors (5xx)
        if (response.status === 429 || response.status >= 500) {
          if (attempt < MAX_RETRIES) {
            const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
            console.log(`Backing off for ${backoff}ms before retrying`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            continue;
          }
        }
        
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract the text from the response
      const text = data.candidates[0].content.parts[0].text;
      
      // Validate and clean the response
      try {
        // Find any JSON array in the text response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('No JSON array found in response');
        }
        
        const jsonStr = jsonMatch[0];
        const keywords = JSON.parse(jsonStr);
        
        if (!Array.isArray(keywords)) {
          throw new Error('Response is not an array');
        }
        
        // Filter out any objects that don't have the expected structure
        const validKeywords = keywords.filter(
          (k) => k && typeof k === 'object' && 'keyword' in k && 'frequency' in k
        );
        
        if (validKeywords.length === 0) {
          throw new Error('No valid keywords found in response');
        }
        
        return validKeywords;
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.error('Raw response:', text);
        
        if (attempt < MAX_RETRIES) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`Invalid response format. Backing off for ${backoff}ms before retrying`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
        
        throw new Error(`Failed to parse keywords from Gemini response: ${parseError.message}`);
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.log(`Backing off for ${backoff}ms before retrying`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      } else {
        console.error('All retry attempts failed');
        throw error;
      }
    }
  }
  
  throw new Error('Failed to extract keywords after all retry attempts');
}
