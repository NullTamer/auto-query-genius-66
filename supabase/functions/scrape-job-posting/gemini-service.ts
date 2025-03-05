
import { delay } from './utils.ts';

export class GeminiService {
  private apiKey: string;
  private retryCount: number = 3;
  private retryDelay: number = 1000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractKeywords(jobDescription: string): Promise<Array<{keyword: string, frequency: number}>> {
    console.log('Extracting keywords with Gemini API');
    
    // Implement retry logic for robustness
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        // Add delay between attempts to avoid rate limiting
        if (attempt > 1) {
          console.log(`Retry attempt ${attempt} for Gemini API`);
          await delay(this.retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
        }
        
        const prompt = `
        You are an expert recruiter and hiring manager with deep expertise in technical roles.
        
        Please extract the most important skills, technologies, and requirements from the job description below.
        
        Return ONLY a JSON array of objects with the format:
        [{"keyword": "Skill or Technology Name", "frequency": number representing importance from 1-5}]
        
        Do not include any markdown, explanation, or other text, just the JSON array.
        Sort them by frequency (importance) in descending order.
        
        JOB DESCRIPTION:
        ${jobDescription}
        `;
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.3,
                topK: 32,
                topP: 1,
                maxOutputTokens: 1024,
              },
              safetySettings: [
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_NONE"
                }
              ]
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error(`Gemini API error (attempt ${attempt}/${this.retryCount}):`, error);
          
          // For specific error codes that might benefit from retry
          if (response.status === 429 || response.status === 503 || response.status === 502) {
            continue; // Try again
          }
          
          throw new Error(`Failed to process with Gemini: ${JSON.stringify(error)}`);
        }

        const aiResponse = await response.json();
        
        if (!aiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
          console.error(`Invalid Gemini API response format (attempt ${attempt}/${this.retryCount}):`, aiResponse);
          continue; // Try again if response format is unexpected
        }

        const textResponse = aiResponse.candidates[0].content.parts[0].text;
        console.log('Gemini response received:', textResponse.substring(0, 100) + '...');
        
        try {
          // Clean up any markdown code formatting that might be in the response
          const cleanJson = textResponse.replace(/```json|```/g, '').trim();
          const keywords = JSON.parse(cleanJson);
          console.log(`Extracted ${keywords.length} keywords from job description`);
          return keywords;
        } catch (e) {
          console.error(`Failed to parse Gemini response (attempt ${attempt}/${this.retryCount}):`, e);
          
          if (attempt < this.retryCount) {
            continue; // Try again
          }
          
          throw new Error("Failed to parse response from Gemini");
        }
      } catch (error) {
        console.error(`Error calling Gemini API (attempt ${attempt}/${this.retryCount}):`, error);
        
        if (attempt < this.retryCount) {
          continue; // Try again
        }
        
        throw error;
      }
    }
    
    throw new Error(`Failed to extract keywords after ${this.retryCount} attempts`);
  }
}
