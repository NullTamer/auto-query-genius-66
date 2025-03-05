
import { delay } from './utils.ts';

export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractKeywords(jobDescription: string): Promise<string[]> {
    await delay(2000); // 2s throttle between requests
    
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
              text: `Extract the most important technical keywords from this job description. Return only a list of keywords, lowercase, no explanations:\n\n${jobDescription}`
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

    return aiResponse.candidates[0].content.parts[0].text
      .toLowerCase()
      .split(/[\n,]/)
      .map(k => k.trim())
      .filter(k => k.length > 2);
  }
}
