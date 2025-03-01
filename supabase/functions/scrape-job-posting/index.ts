import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractKeywordsFromJob } from "./job-repository.ts";
import { extractTextFromPDFWithGemini } from "./gemini-service.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing request to scrape-job-posting");
    
    // Check if this is a form data request (PDF upload)
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      return await handlePDFUpload(req);
    }
    
    // Otherwise, handle JSON data (direct job description text)
    const requestData = await req.json();
    
    if (!requestData.jobDescription && !requestData.pdfContent) {
      throw new Error("No job description provided");
    }
    
    const userId = requestData.userId || null;
    
    // Process the job description
    const result = await extractKeywordsFromJob({
      description: requestData.jobDescription || '',
      userId
    });
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in scrape-job-posting function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An unknown error occurred" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Handles PDF file uploads and processes them for job descriptions
 */
async function handlePDFUpload(req: Request) {
  try {
    console.log("Processing PDF upload");
    const formData = await req.formData();
    const pdfFile = formData.get('file');
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      throw new Error("No PDF file provided");
    }
    
    console.log(`Processing PDF upload: ${pdfFile.name} (${pdfFile.size} bytes)`);
    
    // Check file size (limit to 5MB)
    if (pdfFile.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "PDF file is too large (max 5MB)" 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generate a unique filename and store in Storage
    const fileExt = pdfFile.name.split('.').pop()?.toLowerCase() || 'pdf';
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}_${pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    
    // Upload to storage
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.7.1");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log(`PDF uploaded to storage: ${uniqueFilename}`);
    
    // Process PDF to extract text using Gemini API in a more efficient way
    const arrayBuffer = await pdfFile.arrayBuffer();
    const textContent = await extractTextFromPDFWithGemini(arrayBuffer);
    
    if (!textContent || textContent.length === 0) {
      throw new Error("Could not extract text from PDF");
    }
    
    // Get the user ID if provided
    const userId = formData.get('userId')?.toString() || null;
    
    // Process the job description from the PDF
    const result = await extractKeywordsFromJob({
      description: textContent,
      userId
    });
    
    // Add the text length to help with debugging
    return new Response(
      JSON.stringify({
        ...result,
        textLength: textContent.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error in handlePDFUpload:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Failed to process PDF: ${error.message}` 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
