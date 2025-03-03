
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

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
    console.log("PDF processing request received");
    const formData = await req.formData();
    const file = formData.get('pdf');

    if (!file) {
      console.error("No PDF file uploaded");
      return new Response(
        JSON.stringify({ success: false, error: 'No PDF file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing PDF: ${file.name}, size: ${file.size}, type: ${file.type}`);
    
    if (file.type !== 'application/pdf') {
      console.error("Invalid file type, expected PDF");
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid file type, expected PDF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from session if available
    let userId = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError) {
        console.error("Auth error:", authError);
      } else if (user) {
        userId = user.id;
        console.log(`Authenticated user: ${userId}`);
      }
    }

    // Upload PDF to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const sanitizedFileName = file.name.replace(/[^\x00-\x7F]/g, '');
    const fileExt = sanitizedFileName.split('.').pop() || 'pdf';
    const fileNameWithoutExt = sanitizedFileName.replace(`.${fileExt}`, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueId = crypto.randomUUID();
    const filePath = `${fileNameWithoutExt}_${timestamp}_${uniqueId}.${fileExt}`;

    console.log(`Uploading PDF to Storage: ${filePath}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('job_pdfs')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload PDF', details: uploadError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log("PDF uploaded successfully, extracting text...");
    
    // Extract text from PDF using pdf.js
    const typedArray = new Uint8Array(fileBuffer);
    
    // Initialize PDF.js worker
    const workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    if (globalThis.pdfjsLib) {
      globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    }
    
    // Load PDF document
    const loadingTask = pdfjs.getDocument({ data: typedArray });
    const pdfDocument = await loadingTask.promise;
    console.log(`PDF loaded with ${pdfDocument.numPages} pages`);
    
    // Extract text from each page
    let extractedText = "";
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${pdfDocument.numPages}`);
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      extractedText += pageText + " ";
    }
    
    extractedText = extractedText.trim();
    console.log(`Extracted ${extractedText.length} characters of text`);
    
    if (extractedText.length === 0) {
      console.error("No text could be extracted from PDF");
      return new Response(
        JSON.stringify({ success: false, error: 'No text could be extracted from PDF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create a job posting entry in the database
    console.log("Creating job posting entry in database");
    const { data: jobData, error: jobError } = await supabase
      .from('job_postings')
      .insert({
        description: extractedText,
        user_id: userId,
        pdf_path: filePath,
        file_name: sanitizedFileName
      })
      .select('id')
      .single();

    if (jobError) {
      console.error("Database error:", jobError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store job data', details: jobError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const jobId = jobData.id;
    console.log(`Job posting created with ID: ${jobId}`);

    // Process text with Gemini to extract keywords
    console.log("Calling Gemini API to extract keywords");
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error("Missing Gemini API key");
      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId: jobId,
          pdfPath: filePath,
          fileName: sanitizedFileName,
          message: 'PDF uploaded and text extracted, but keyword extraction not performed due to missing API key'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `
    Analyze the following job description and extract the most important technical skills, qualifications, and requirements.
    Return only a JSON array of objects with "keyword" and "frequency" properties, where frequency is a number from 1-5 indicating importance.
    Focus on hard skills, technologies, tools, and specific qualifications. 
    For example: [{"keyword": "React", "frequency": 5}, {"keyword": "JavaScript", "frequency": 4}]
    
    Job Description:
    ${extractedText.substring(0, 15000)}
    `;

    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        }
      })
    });

    const geminiData = await geminiResponse.json();
    console.log("Gemini response received");

    let keywords = [];
    try {
      if (geminiData.candidates && geminiData.candidates.length > 0) {
        const text = geminiData.candidates[0].content.parts[0].text;
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']') + 1;
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = text.substring(jsonStart, jsonEnd);
          keywords = JSON.parse(jsonString);
          console.log(`Extracted ${keywords.length} keywords`);
          
          // Store keywords in the database
          if (keywords.length > 0) {
            console.log("Storing keywords in database");
            const keywordsToInsert = keywords.map((kw: any) => ({
              job_posting_id: jobId,
              keyword: kw.keyword,
              frequency: kw.frequency || 1
            }));
            
            const { error: kwError } = await supabase
              .from('extracted_keywords')
              .insert(keywordsToInsert);
              
            if (kwError) {
              console.error("Error storing keywords:", kwError);
            } else {
              console.log("Keywords stored successfully");
            }
          }
        }
      }
    } catch (parseError) {
      console.error("Error parsing keywords:", parseError);
    }

    console.log("PDF processing completed successfully");
    
    // Return success response with job ID and keywords
    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobId,
        pdfPath: filePath,
        fileName: sanitizedFileName,
        keywords: keywords,
        message: 'PDF processed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
