
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

// Define a helper for returning error responses
const errorResponse = (message: string, status = 400, details?: any) => {
  console.error(`Error: ${message}`, details);
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message,
      details: details
    }),
    { 
      status, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
};

// Create a Supabase client with the admin key
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function extractKeywordsWithGemini(text: string) {
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const prompt = `
      You are an expert job posting analyzer. I'll provide a job description, and I need you to:
      1. Extract all relevant technical skills, tools, frameworks, and technologies mentioned
      2. Include soft skills if explicitly mentioned
      3. Format the response ONLY as JSON array with each object having:
         - keyword: the skill or keyword
         - frequency: number of occurrences or importance (1 if just mentioned once)
      
      Do not include any explanation or text outside the JSON array. 
      Only extract actually mentioned keywords, don't infer or add keywords not explicitly in the text.
      Return at most 30 keywords, prioritizing the most important ones.
      
      Here's the job description:
      ${text.slice(0, 15000)}
      ${text.length > 15000 ? "[text truncated due to length]" : ""}
    `;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }

    const candidateText = data.candidates[0].content.parts[0].text;
    
    // Extract JSON array from the response
    let jsonStr = candidateText;
    if (jsonStr.includes('[') && jsonStr.includes(']')) {
      jsonStr = jsonStr.substring(
        jsonStr.indexOf('['),
        jsonStr.lastIndexOf(']') + 1
      );
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error in extractKeywordsWithGemini:", error);
    throw error;
  }
}

// Directly extract text from PDF using Gemini's document understanding
async function extractTextFromPDFWithGemini(fileContent: Uint8Array) {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  // Convert PDF to base64 without loading the entire file into memory at once
  const base64Chunks: string[] = [];
  const chunkSize = 1024 * 512; // 512KB chunks to avoid memory issues
  
  for (let i = 0; i < fileContent.length; i += chunkSize) {
    const chunk = fileContent.slice(i, i + chunkSize);
    base64Chunks.push(btoa(String.fromCharCode(...chunk)));
  }
  
  const base64Data = base64Chunks.join('');
  console.log(`Converted PDF to base64 (${base64Data.length} characters)`);

  try {
    const prompt = "Please extract all the text from this PDF document. Return ONLY the text content, with proper paragraph formatting preserved.";
    
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: base64Data
                }
              }
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096, // Increased token limit for longer PDFs
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini Vision API error:", errorData);
      throw new Error(`Gemini Vision API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini Vision API");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error extracting text from PDF with Gemini:", error);
    throw error;
  }
}

async function processJobPosting(jobData: { jobDescription: string, userId?: string }) {
  try {
    console.log("Processing job description");
    
    // Insert a new record in the job_postings table
    const { data: jobRecord, error: jobInsertError } = await supabaseAdmin
      .from("job_postings")
      .insert([
        {
          content: jobData.jobDescription,
          status: "pending",
          user_id: jobData.userId || null,
          is_public: jobData.userId ? false : true,
        },
      ])
      .select()
      .single();

    if (jobInsertError) {
      console.error("Error inserting job posting:", jobInsertError);
      throw jobInsertError;
    }

    console.log("Job posting inserted with ID:", jobRecord.id);

    try {
      // Extract keywords using Gemini
      const keywords = await extractKeywordsWithGemini(jobData.jobDescription);
      console.log("Extracted keywords:", keywords);

      // Update job posting status to processed
      const { error: updateError } = await supabaseAdmin
        .from("job_postings")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", jobRecord.id);

      if (updateError) {
        console.error("Error updating job status:", updateError);
        throw updateError;
      }

      // Insert keywords into the database
      if (keywords && keywords.length > 0) {
        const keywordsData = keywords.map((k: any) => ({
          job_posting_id: jobRecord.id,
          keyword: k.keyword,
          frequency: k.frequency || 1,
          user_id: jobData.userId || null,
          is_public: jobData.userId ? false : true,
        }));

        const { error: keywordInsertError } = await supabaseAdmin
          .from("extracted_keywords")
          .insert(keywordsData);

        if (keywordInsertError) {
          console.error("Error inserting keywords:", keywordInsertError);
          // Continue even if keyword insertion fails
        }
      }

      return {
        success: true,
        jobId: jobRecord.id,
        keywords: keywords,
      };
    } catch (processingError) {
      console.error("Error during processing:", processingError);
      
      // Update job posting status to failed
      await supabaseAdmin
        .from("job_postings")
        .update({
          status: "failed",
          description: processingError.message,
        })
        .eq("id", jobRecord.id);

      throw processingError;
    }
  } catch (error) {
    console.error("Error in processJobPosting:", error);
    throw error;
  }
}

async function handlePDFUpload(formData: FormData) {
  try {
    // Get the file from the form data
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return errorResponse("No PDF file provided");
    }
    
    console.log(`Processing PDF upload: ${file.name} (${file.size} bytes)`);
    
    if (file.type !== "application/pdf") {
      return errorResponse("File must be a PDF");
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return errorResponse("PDF file is too large (max 10MB)");
    }

    // Get user ID from form data (if authenticated)
    const userId = formData.get("userId")?.toString();
    
    // Create a unique file path for the PDF
    const timestamp = new Date().getTime();
    const fileExt = file.name.split(".").pop();
    const filePath = `${timestamp}_${Math.floor(Math.random() * 10000)}.${fileExt}`;
    
    // Upload the file to Supabase Storage
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from("job_pdfs")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });
    
    if (storageError) {
      console.error("Error uploading PDF to storage:", storageError);
      return errorResponse("Failed to upload PDF", 500, storageError);
    }
    
    console.log(`PDF uploaded to storage: ${filePath}`);
    
    // Get the uploaded file data to process
    const { data: fileData, error: fileError } = await supabaseAdmin.storage
      .from("job_pdfs")
      .download(filePath);
    
    if (fileError || !fileData) {
      console.error("Error downloading PDF from storage:", fileError);
      return errorResponse("Failed to process PDF", 500, fileError);
    }
    
    // Extract text from the PDF using Gemini
    const extractedText = await extractTextFromPDFWithGemini(new Uint8Array(await fileData.arrayBuffer()));
    console.log(`Extracted text: ${extractedText.length} characters`);
    
    if (!extractedText || extractedText.length < 50) {
      return errorResponse("Failed to extract meaningful text from PDF", 400);
    }
    
    // Process the job posting with the extracted text
    const result = await processJobPosting({
      jobDescription: extractedText,
      userId: userId,
    });
    
    return new Response(
      JSON.stringify({
        ...result,
        textLength: extractedText.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handlePDFUpload:", error);
    return errorResponse("Failed to process PDF", 500, error.message);
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Only POST requests are supported", 405);
    }

    const contentType = req.headers.get("content-type") || "";
    
    // Handle form data (PDF upload)
    if (contentType.includes("multipart/form-data")) {
      return await handlePDFUpload(await req.formData());
    }
    
    // Handle JSON data (direct job description)
    if (contentType.includes("application/json")) {
      const jsonData = await req.json();
      
      if (!jsonData.jobDescription || typeof jsonData.jobDescription !== "string") {
        return errorResponse("Job description is required");
      }
      
      if (jsonData.jobDescription.trim().length < 50) {
        return errorResponse("Job description is too short");
      }
      
      const result = await processJobPosting({
        jobDescription: jsonData.jobDescription,
        userId: jsonData.userId,
      });
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Unsupported content type
    return errorResponse("Unsupported content type", 415);

  } catch (error) {
    console.error("Unhandled error:", error);
    return errorResponse(
      "An unexpected error occurred", 
      500, 
      { message: error.message }
    );
  }
});
