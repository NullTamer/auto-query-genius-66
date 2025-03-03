
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("PDF processing function started");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract authorization header
    const authHeader = req.headers.get('Authorization');
    
    // Log authorization header (without the token value for security)
    console.log("Authorization header present:", !!authHeader);
    
    // Get Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    // Get the user's session
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError) {
        console.error("Error verifying user token:", userError.message);
      } else if (user) {
        userId = user.id;
        console.log("Authenticated user ID:", userId);
      }
    } else {
      console.log("Processing as anonymous user");
    }

    // Parse form data for file upload
    const formData = await req.formData();
    const pdfFile = formData.get("pdf");
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      throw new Error("No PDF file provided");
    }
    
    console.log("PDF file received:", pdfFile.name, "size:", pdfFile.size);
    
    // Store the PDF file in Supabase Storage
    const timestamp = new Date().getTime();
    const filePath = `${timestamp}_${pdfFile.name.replace(/\s+/g, '_')}`;
    const fileBuffer = await pdfFile.arrayBuffer();
    
    // Upload to the job_pdfs bucket
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from("job_pdfs")
      .upload(filePath, fileBuffer, {
        contentType: pdfFile.type,
        cacheControl: "3600",
        upsert: false,
      });
    
    if (uploadError) {
      console.error("Error uploading PDF:", uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }
    
    console.log("PDF uploaded successfully to path:", filePath);
    
    // Extract text from the PDF
    const pdfData = new Uint8Array(fileBuffer);
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    console.log("PDF loaded, extracting text from", pdf.numPages, "pages");
    
    let extractedText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => {
        return "str" in item ? item.str : "";
      }).join(" ");
      
      extractedText += pageText + "\n";
    }
    
    console.log("Text extraction complete, length:", extractedText.length);
    
    // Create a job posting record
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from("job_postings")
      .insert({
        job_description: extractedText,
        user_id: userId,
        pdf_path: filePath,
        pdf_name: pdfFile.name,
        status: "pending",
      })
      .select('id')
      .single();
    
    if (jobError) {
      console.error("Error creating job posting:", jobError);
      throw new Error(`Failed to create job posting: ${jobError.message}`);
    }
    
    console.log("Job posting created with ID:", jobData.id);
    
    // Now extract keywords from the content using the scrape-job-posting function
    // We'll do this by invoking another edge function with the job ID
    const invokeResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape-job-posting`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          jobDescription: extractedText,
          jobId: jobData.id,
          userId: userId,
        }),
      }
    );
    
    if (!invokeResponse.ok) {
      console.error("Error invoking scrape-job-posting:", await invokeResponse.text());
      // We'll continue anyway and return what we have
    }
    
    // Fetch keywords for this job
    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from("extracted_keywords")
      .select("keyword, frequency")
      .eq("job_posting_id", jobData.id)
      .order("frequency", { ascending: false });
    
    if (keywordsError) {
      console.error("Error fetching keywords:", keywordsError);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobData.id,
        pdfPath: filePath,
        fileName: pdfFile.name,
        textLength: extractedText.length,
        keywords: keywords || [],
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
