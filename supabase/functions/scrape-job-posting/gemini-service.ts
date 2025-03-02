
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY") || "");

/**
 * Extracts text from a PDF using Gemini's document understanding capabilities
 * instead of trying to encode the entire PDF as base64
 */
export async function extractTextFromPDFWithGemini(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("Extracting text from PDF with Gemini");
    
    // Convert ArrayBuffer to Uint8Array for processing
    const pdfBytes = new Uint8Array(pdfArrayBuffer);
    
    // Process in chunks to avoid stack overflow
    const MAX_CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const fileChunks = [];
    
    // Split the PDF into manageable chunks
    for (let i = 0; i < pdfBytes.length; i += MAX_CHUNK_SIZE) {
      const chunk = pdfBytes.slice(i, Math.min(i + MAX_CHUNK_SIZE, pdfBytes.length));
      fileChunks.push(chunk);
    }
    
    console.log(`PDF split into ${fileChunks.length} chunks for processing`);
    
    // Use Gemini Pro Vision model for document understanding
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    // Process the first chunk (or a few chunks if needed) to extract main content
    // Most job descriptions should be in the first few pages
    const firstChunk = fileChunks[0];
    
    // Create a file part from the PDF chunk
    const filePart = {
      inlineData: {
        data: arrayBufferToBase64(firstChunk.buffer),
        mimeType: "application/pdf"
      }
    };

    const prompt = "Extract and return ONLY the text content from this PDF document. Do not include any analysis, just return the raw text content.";
    
    // Generate content
    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();
    
    if (!text || text.length === 0) {
      throw new Error("No text extracted from PDF");
    }
    
    console.log(`Successfully extracted ${text.length} characters from PDF`);
    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Converts an ArrayBuffer to a base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // For Deno, we need to create a Uint8Array first
  const bytes = new Uint8Array(buffer);
  let binary = '';
  
  // Process in chunks to avoid stack overflow
  const CHUNK_SIZE = 10000;
  for (let i = 0; i < bytes.byteLength; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, Math.min(i + CHUNK_SIZE, bytes.byteLength));
    const binaryChunk = Array.from(chunk)
      .map(b => String.fromCharCode(b))
      .join('');
    binary += binaryChunk;
  }
  
  // Use btoa for base64 encoding
  return btoa(binary);
}

/**
 * Uses Gemini API to extract keywords from a job description
 */
export async function extractKeywordsWithGemini(jobDescription: string) {
  try {
    // Use a non-vision model for text processing
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
      throw new Error("Could not extract valid JSON from Gemini response");
    }

    const jsonStr = jsonMatch[0];
    const keywords = JSON.parse(jsonStr);

    return keywords;
  } catch (error) {
    console.error("Error extracting keywords with Gemini:", error);
    throw new Error(`Failed to extract keywords: ${error.message}`);
  }
}
