
// Follow the Deno Deploy runtime docs:
// https://deno.com/deploy/docs/runtime-api
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createJobPosting, processPdfFile } from "./job-repository.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Hello from scrape-job-posting function!");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing request to scrape-job-posting");
    
    // Parse request body
    const requestData = await req.json();
    
    // Handle job description text
    if (requestData.jobDescription) {
      console.log("Processing job description");
      
      const { jobId } = await createJobPosting(
        requestData.userId, 
        requestData.jobDescription
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          jobId
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    // Handle PDF file (mock implementation)
    if (requestData.file) {
      console.log("PDF file detected in request");
      
      // Since we can't actually process binary files via JSON,
      // we'll treat this as if we received PDF text from the frontend
      // In a real implementation, you would use form data to upload the file
      const mockPdfText = `This is mock text extracted from a PDF file.
      The file name was: ${requestData.file.name || "unknown"}
      A real implementation would extract the actual content from the PDF.
      For now, we're generating keywords based on this placeholder text.`;
      
      const result = await processPdfFile(requestData.userId, mockPdfText);
      
      return new Response(
        JSON.stringify(result),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }
    
    // Handle error case
    return new Response(
      JSON.stringify({
        success: false,
        error: "No job description or file provided"
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error in scrape-job-posting function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An error occurred while processing the job posting"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});

/**
 * Extract text from a PDF (placeholder function)
 */
function extractTextFromPDF(pdfBuffer: ArrayBuffer): string {
  try {
    console.log("Extracting text from PDF (mock implementation)");
    // In a real implementation, this would use a PDF parsing library
    // For now, return a placeholder message
    return "This is placeholder text extracted from the PDF. The actual implementation would use a PDF parsing library.";
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}
