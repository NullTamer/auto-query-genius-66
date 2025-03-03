
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Create client with anonymous key for storage operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // Create admin client with service role key for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { pdfUrl } = await req.json();

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No PDF URL provided" 
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );
    }

    console.log("Processing PDF from URL:", pdfUrl);

    // Fetch the PDF content
    let pdfResponse;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds delay between retries
    
    while (retryCount < maxRetries) {
      try {
        pdfResponse = await fetch(pdfUrl);
        
        if (pdfResponse.status === 404) {
          console.log(`PDF not found (404). Retry ${retryCount + 1}/${maxRetries}`);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "PDF not found" 
            }),
            { 
              status: 404, 
              headers: { 
                ...corsHeaders,
                "Content-Type": "application/json" 
              } 
            }
          );
        }
        
        if (pdfResponse.status === 429) {
          console.log(`Rate limit exceeded (429). Retry ${retryCount + 1}/${maxRetries}`);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Rate limit exceeded" 
            }),
            { 
              status: 429, 
              headers: { 
                ...corsHeaders,
                "Content-Type": "application/json" 
              } 
            }
          );
        }
        
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
        }
        
        break; // Success, exit the retry loop
      } catch (error) {
        console.error(`Error fetching PDF (attempt ${retryCount + 1}/${maxRetries}):`, error);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          throw error;
        }
      }
    }

    // Extract text from PDF using an external service or library
    // This is a simplified example
    const pdfBuffer = await pdfResponse.arrayBuffer();
    
    // Mock PDF text extraction for this example
    // In a real implementation, you'd use PDF.js or a similar library
    const extractedText = `This is extracted text from a PDF document at ${pdfUrl}. 
    In a real implementation, you would use PDF.js or a similar library to extract the actual text.
    For now, this is a placeholder to demonstrate the flow.`;
    
    console.log("Extracted text from PDF:", extractedText.substring(0, 100) + "...");

    // Store the job posting in the database
    const { data: jobPosting, error: jobError } = await supabaseAdmin
      .from('job_postings')
      .insert([
        { 
          content: extractedText,
          pdf_path: pdfUrl,
          is_public: true,
          status: 'processed',
          processed_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (jobError) {
      console.error("Error storing job posting:", jobError);
      throw jobError;
    }

    console.log("Job posting stored with ID:", jobPosting.id);

    // Generate keywords (in a real implementation, you might use an AI service here)
    const keywords = [
      { keyword: "pdf", frequency: 5 },
      { keyword: "document", frequency: 3 },
      { keyword: "text", frequency: 7 },
      { keyword: "extraction", frequency: 2 }
    ];

    // Store the keywords
    const { error: keywordsError } = await supabaseAdmin
      .from('extracted_keywords')
      .insert(
        keywords.map(k => ({
          job_posting_id: jobPosting.id,
          keyword: k.keyword,
          frequency: k.frequency,
          is_public: true
        }))
      );

    if (keywordsError) {
      console.error("Error storing keywords:", keywordsError);
      throw keywordsError;
    }

    console.log("Keywords stored successfully");

    // Return the response
    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobPosting.id,
        pdfPath: pdfUrl,
        extractedText: extractedText,
        keywords: keywords
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
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
