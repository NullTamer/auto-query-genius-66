
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Configure PDF.js worker
const pdfjsWorker = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js");
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface RequestPayload {
  pdfUrl: string;
  fileName: string;
  userId?: string;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
    const payload: RequestPayload = await req.json();
    const { pdfUrl, fileName, userId } = payload;

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing PDF URL in request" 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }

    console.log(`Processing PDF: ${pdfUrl}`);

    // Fetch the PDF file
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch PDF: ${pdfResponse.statusText}` 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    
    // Parse PDF text using PDF.js
    const loadingTask = pdfjs.getDocument({ data: pdfArrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log(`PDF loaded. Number of pages: ${pdf.numPages}`);
    
    let fullText = "";
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }
    
    console.log(`Extracted ${fullText.length} characters of text from PDF`);
    
    // Trim the text to ensure it's not too long for the database
    const maxLength = 500000; // Set a reasonable maximum length
    const trimmedText = fullText.length > maxLength 
      ? fullText.substring(0, maxLength) + "... (truncated)"
      : fullText;
    
    // Create a job posting record in the database
    const { data: jobData, error: jobError } = await supabase
      .from("job_postings")
      .insert({
        title: fileName,
        content: trimmedText,
        pdf_path: pdfUrl,
        user_id: userId,
        status: "pending"
      })
      .select("id")
      .single();
    
    if (jobError) {
      console.error("Error creating job posting:", jobError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create job posting: ${jobError.message}` 
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
    
    const jobId = jobData.id;
    console.log(`Created job posting with ID: ${jobId}`);
    
    // Now process the job to extract keywords using the scrape-job-posting function
    const { data: processingData, error: processingError } = await supabase.functions.invoke(
      "scrape-job-posting",
      {
        body: { 
          jobId,
          userId 
        }
      }
    );
    
    if (processingError) {
      console.error("Error processing job:", processingError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId,
          pdfPath: pdfUrl,
          warning: `Job created but keyword extraction failed: ${processingError.message}` 
        }),
        { headers: corsHeaders, status: 200 }
      );
    }
    
    // Return the successful response
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        pdfPath: pdfUrl,
        fileName,
        keywords: processingData.keywords || [],
        message: "PDF processed successfully"
      }),
      { headers: corsHeaders, status: 200 }
    );
    
  } catch (error) {
    console.error("Error processing PDF:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error.message}` 
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
