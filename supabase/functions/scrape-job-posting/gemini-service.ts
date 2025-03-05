
import { delay } from './utils.ts';

export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractKeywords(jobDescription: string): Promise<Array<{keyword: string, frequency: number}>> {
    await delay(2000); // 2s throttle between requests
    
    console.log('Extracting keywords with Gemini API');
    
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
    
    try {
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
        console.error('Gemini API error:', error);
        throw new Error(`Failed to process with Gemini: ${JSON.stringify(error)}`);
      }

      const aiResponse = await response.json();
      
      if (!aiResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini API');
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
        console.error("Failed to parse Gemini response:", e);
        throw new Error("Failed to parse response from Gemini");
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw error;
    }
  }
}
