
// Follow the Deno Deploy runtime docs:
// https://deno.com/deploy/docs/runtime-api
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createJobPosting, processPdfFile, extractKeywordsFromJob } from "./job-repository.ts";
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
    console.log("Request data received:", JSON.stringify(requestData).substring(0, 200) + "...");
    
    // Handle PDF file processing
    if (requestData.isPdf === true) {
      console.log("PDF file detected in request");
      
      const userId = requestData.userId;
      const fileName = requestData.fileName || "unknown.pdf";
      
      if (!requestData.fileData || !Array.isArray(requestData.fileData)) {
        throw new Error("Invalid PDF data format");
      }
      
      // Convert the array back to Uint8Array
      const pdfData = new Uint8Array(requestData.fileData);
      console.log(`Processing PDF with size: ${pdfData.length} bytes`);
      
      try {
        // Process the PDF file
        const result = await processPdfFile(userId, pdfData, fileName);
        console.log("PDF processing result:", JSON.stringify(result).substring(0, 200) + "...");
        
        return new Response(
          JSON.stringify(result),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      } catch (error) {
        console.error("Error processing PDF:", error);
        throw new Error(`Failed to process PDF: ${error.message}`);
      }
    }
    
    // Handle job description text
    if (requestData.jobDescription) {
      console.log("Processing job description text");
      
      try {
        const { jobId } = await createJobPosting(
          requestData.userId, 
          requestData.jobDescription
        );
        
        // For text input, we can immediately extract keywords
        try {
          await extractKeywordsFromJob(jobId);
        } catch (keywordError) {
          console.error("Error extracting keywords:", keywordError);
          // Continue even if keyword extraction fails - we'll handle it on the frontend
        }
        
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
      } catch (error) {
        console.error("Error creating job posting:", error);
        throw new Error(`Failed to create job posting: ${error.message}`);
      }
    }
    
    // Handle error case
    return new Response(
      JSON.stringify({
        success: false,
        error: "No job description or PDF data provided"
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
