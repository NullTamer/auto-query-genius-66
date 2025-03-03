
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
    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Create client with anonymous key for storage operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // Create admin client with service role key for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { jobDescription, pdfUrl, is_public = false } = await req.json();

    if (!jobDescription && !pdfUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No job description or PDF URL provided" 
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

    // Source of the job description
    const source = pdfUrl ? 'pdf' : 'text';
    console.log(`Processing job description from ${source}`);

    // Content to process
    const contentToProcess = jobDescription || "";

    // Create a job posting entry
    const { data: jobPosting, error: jobError } = await supabaseAdmin
      .from('job_postings')
      .insert([
        { 
          content: contentToProcess,
          pdf_path: pdfUrl || null,
          is_public: true, // Always make it public for anonymous access
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

    // Generate keywords based on the job description
    // In a real implementation, you'd use NLP or an AI service
    const keywordExtractor = (text: string) => {
      // Simple mock implementation - extract words and count frequencies
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      const wordCount: Record<string, number> = {};
      
      words.forEach(word => {
        if (word.length > 3) { // Only consider words with more than 3 characters
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });
      
      // Convert to array and sort by frequency
      return Object.entries(wordCount)
        .filter(([word]) => !['and', 'the', 'for', 'with', 'that', 'this'].includes(word))
        .map(([keyword, frequency]) => ({ keyword, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20); // Take top 20 keywords
    };

    const extractedKeywords = keywordExtractor(contentToProcess);

    // Store the keywords
    if (extractedKeywords.length > 0) {
      const { error: keywordsError } = await supabaseAdmin
        .from('extracted_keywords')
        .insert(
          extractedKeywords.map(k => ({
            job_posting_id: jobPosting.id,
            keyword: k.keyword,
            frequency: k.frequency,
            is_public: true // Always make keywords public for anonymous access
          }))
        );

      if (keywordsError) {
        console.error("Error storing keywords:", keywordsError);
        throw keywordsError;
      }

      console.log("Keywords stored successfully");
    }

    // Return the response
    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobPosting.id,
        keywords: extractedKeywords,
        source: source
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
    console.error("Error processing job posting:", error);
    
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
