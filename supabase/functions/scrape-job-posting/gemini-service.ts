
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "https://esm.sh/@google/generative-ai@^0.2.0"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set')
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// Process text into keywords using Gemini
export async function getKeywords(text: string) {
  try {
    console.log(`Processing job text (${text.length} characters) to extract keywords`)
    
    // If text is too long, trim it to avoid hitting context length limits
    const trimmedText = text.length > 30000 ? text.substring(0, 30000) : text
    
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    })
    
    const prompt = `
    You are a keyword extraction system for job descriptions.
    
    Extract the most important keywords from this job description. Focus on:
    1. Technical skills (programming languages, tools, frameworks, methodologies)
    2. Soft skills
    3. Education requirements
    4. Experience level
    5. Industry-specific terminology
    
    Format your response as a JSON array of objects, with each object having these properties:
    - keyword: The keyword or phrase
    - category: The category it belongs to (technical, soft skill, education, experience, industry)
    - frequency: A number from 1-5 indicating how important this keyword seems in the job description (5 being most important)
    
    Only include the JSON array in your response, no explanation or other text.
    
    Job description:
    ${trimmedText}
    `
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text()
    
    try {
      // Try to parse the response as JSON, extracting just the array if needed
      let jsonStart = responseText.indexOf('[')
      let jsonEnd = responseText.lastIndexOf(']')
      
      if (jsonStart >= 0 && jsonEnd >= 0) {
        const jsonString = responseText.substring(jsonStart, jsonEnd + 1)
        return JSON.parse(jsonString)
      } else {
        // If no array brackets, try parsing the whole thing
        return JSON.parse(responseText)
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError)
      console.log("Raw response:", responseText)
      
      // Fallback to returning a simple array of extracted terms
      return [{ keyword: "ERROR: Keywords could not be extracted", category: "error", frequency: 1 }]
    }
  } catch (error) {
    console.error("Error in getKeywords:", error)
    throw new Error(`Failed to extract keywords: ${error.message}`)
  }
}

// Process a PDF file directly with Gemini
export async function processText(pdfBytes: Uint8Array, mimeType: string): Promise<string> {
  try {
    console.log("Processing PDF with Gemini's document understanding capabilities")
    
    // Process the PDF data in chunks to avoid exceeding stack size
    const chunkSize = 100000; // Smaller chunks to avoid stack overflow
    let text = "";
    
    // Process smaller parts of the file if it's large
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      const chunk = pdfBytes.slice(i, Math.min(i + chunkSize, pdfBytes.length));
      
      // Directly ask Gemini to extract the content from this chunk
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      try {
        const prompt = "Extract and provide all the text content from this PDF document part. Give me only the raw text, nothing else.";
        
        // Create a file part for this chunk
        const filePart = {
          inlineData: {
            data: arrayBufferToBase64(chunk),
            mimeType: mimeType,
          },
        };
        
        const result = await model.generateContent([prompt, filePart]);
        const response = await result.response;
        text += response.text() + " ";
        
        // If we got substantial text, we can stop processing more chunks
        if (text.length > 1000) {
          break;
        }
      } catch (chunkError) {
        console.warn(`Error processing chunk ${i}-${i+chunkSize}: ${chunkError.message}`);
        // Continue with next chunk if one fails
      }
    }
    
    return text.trim();
  } catch (error) {
    console.error("Error in processText:", error);
    throw new Error(`Failed to process PDF with Gemini: ${error.message}`);
  }
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  
  // Process in smaller chunks to avoid stack overflow
  const chunkSize = 1024;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.slice(i, Math.min(i + chunkSize, len));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  
  // Use browser's btoa-equivalent in Deno
  return btoa(binary);
}
