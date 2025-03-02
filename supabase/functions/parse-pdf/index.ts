
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Define proper CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, cache-control',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

// Import Gemini processing function
const generateKeywords = async (text: string) => {
  try {
    // Basic keywords for demo if Gemini is not available
    const demoKeywords = [
      { keyword: "Machine Learning", category: "Skills", weight: 1 },
      { keyword: "Python", category: "Programming", weight: 1 },
      { keyword: "Data Analysis", category: "Skills", weight: 1 },
      { keyword: "SQL", category: "Programming", weight: 1 },
      { keyword: "Communication", category: "Soft Skills", weight: 1 }
    ];
    
    // Make a request to Gemini API through the scrape-job-posting function
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data, error } = await supabaseAdmin.functions.invoke('scrape-job-posting', {
      body: { jobDescription: text }
    });
    
    if (error || !data.keywords) {
      console.error('Error invoking Gemini processing:', error);
      return demoKeywords;
    }
    
    return data.keywords;
  } catch (error) {
    console.error('Error generating keywords:', error);
    return [];
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log('PDF processing function called');
    
    // Process form data for file upload
    let formData;
    try {
      formData = await req.formData();
    } catch (error) {
      console.error('Error parsing form data:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid form data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const pdfFile = formData.get('pdf');
    
    if (!pdfFile) {
      console.error('No PDF file found in request');
      return new Response(
        JSON.stringify({ success: false, error: 'No PDF file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('PDF file received:', pdfFile.name, 'Size:', pdfFile.size);
    
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Check if bucket exists, create if not
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'job_pdfs')) {
      console.log('Creating job_pdfs bucket');
      await supabaseAdmin.storage.createBucket('job_pdfs', {
        public: false
      });
    }
    
    // Prepare file for upload
    const fileExt = pdfFile.name.split('.').pop()?.toLowerCase() || 'pdf';
    const filePath = `${crypto.randomUUID()}.${fileExt}`;
    
    // Upload file to Supabase Storage
    console.log('Uploading PDF to storage:', filePath);
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('job_pdfs')
      .upload(filePath, pdfFile, {
        contentType: 'application/pdf',
        upsert: false
      });
      
    if (storageError) {
      console.error('Error uploading file:', storageError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload PDF', details: storageError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Get public URL for the file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('job_pdfs')
      .getPublicUrl(filePath);
    
    // Create a job posting record
    console.log('Creating job posting record');
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('job_postings')
      .insert({
        raw_text: `[PDF Document: ${pdfFile.name}]`, // Placeholder text
        pdf_path: filePath,
        status: 'processing'
      })
      .select();
    
    if (jobError) {
      console.error('Error creating job posting:', jobError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create job posting', details: jobError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const jobId = jobData[0].id;
    
    // Process with background task
    const processJob = async () => {
      try {
        console.log('Starting background processing for job ID:', jobId);
        
        // Download the PDF for processing
        const { data: pdfBytes, error: downloadError } = await supabaseAdmin.storage
          .from('job_pdfs')
          .download(filePath);
        
        if (downloadError) {
          console.error('Error downloading PDF for processing:', downloadError);
          await updateJobStatus(supabaseAdmin, jobId, 'failed', 'Failed to download PDF for processing');
          return;
        }
        
        // Get text from PDF (basic extraction - just for demo)
        const pdfText = await extractTextFromPdf(pdfBytes);
        
        if (!pdfText || pdfText.trim().length === 0) {
          console.error('Failed to extract text from PDF');
          await updateJobStatus(supabaseAdmin, jobId, 'failed', 'Failed to extract text from PDF');
          return;
        }
        
        console.log('Successfully extracted text from PDF, length:', pdfText.length);
        
        // Update job posting with extracted text
        const { error: updateError } = await supabaseAdmin
          .from('job_postings')
          .update({ raw_text: pdfText })
          .eq('id', jobId);
        
        if (updateError) {
          console.error('Error updating job posting with extracted text:', updateError);
          await updateJobStatus(supabaseAdmin, jobId, 'failed', 'Failed to update job posting');
          return;
        }
        
        // Generate keywords using Gemini
        console.log('Generating keywords from PDF text');
        try {
          const keywords = await generateKeywords(pdfText);
          
          if (!keywords || keywords.length === 0) {
            console.error('Failed to generate keywords');
            await updateJobStatus(supabaseAdmin, jobId, 'failed', 'Failed to generate keywords');
            return;
          }
          
          console.log('Successfully generated keywords:', keywords.length);
          
          // Insert keywords
          const { error: keywordError } = await supabaseAdmin
            .from('job_keywords')
            .insert(
              keywords.map(keyword => ({
                job_id: jobId,
                keyword: keyword.keyword,
                category: keyword.category || 'General',
                weight: keyword.weight || 1
              }))
            );
          
          if (keywordError) {
            console.error('Error inserting keywords:', keywordError);
            await updateJobStatus(supabaseAdmin, jobId, 'failed', 'Failed to save keywords');
            return;
          }
          
          // Update job status to completed
          await updateJobStatus(supabaseAdmin, jobId, 'completed');
          console.log('Job processing completed successfully');
        } catch (aiError) {
          console.error('Error in AI processing:', aiError);
          await updateJobStatus(supabaseAdmin, jobId, 'failed', 'AI processing error');
        }
      } catch (error) {
        console.error('Background processing error:', error);
        await updateJobStatus(supabaseAdmin, jobId, 'failed', 'Background processing error');
      }
    };
    
    // Start background processing
    EdgeRuntime.waitUntil(processJob());
    
    // Return immediate response with job ID
    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId,
        pdfPath: filePath,
        fileName: pdfFile.name,
        keywords: [] // Empty initially - will be populated asynchronously
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in PDF processing:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function updateJobStatus(supabase, jobId, status, errorMessage = null) {
  const updateData = { status };
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }
  
  const { error } = await supabase
    .from('job_postings')
    .update(updateData)
    .eq('id', jobId);
  
  if (error) {
    console.error('Failed to update job status:', error);
  }
}

async function extractTextFromPdf(pdfBytes) {
  try {
    // This is a basic text extraction that works by searching for text patterns in the PDF
    // For production use, consider implementing a more robust solution
    const text = new TextDecoder().decode(pdfBytes);
    
    // Extract text content between stream markers (very basic approach)
    let extractedText = '';
    const regex = /BT\s*(.*?)\s*ET/gs;
    const matches = text.matchAll(regex);
    
    for (const match of matches) {
      if (match[1]) {
        // Clean up text - remove PDF encoding artifacts
        const cleaned = match[1]
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\n/g, '\n')
          .replace(/\\/g, '')
          .replace(/\[|\]/g, '')
          .replace(/\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+\s+\w+\s*/g, '')
          .replace(/Tf/g, '')
          .replace(/TJ/g, '')
          .replace(/Tj/g, '')
          .replace(/\(/g, '')
          .replace(/\)/g, '')
          .replace(/\*/g, '')
          .replace(/</g, '')
          .replace(/>/g, '')
        
        extractedText += cleaned + ' ';
      }
    }
    
    // If the basic extraction didn't yield much text, fall back to searching for readable sequences
    if (extractedText.trim().length < 100) {
      console.log('Basic extraction yielded insufficient text, trying fallback method');
      // Look for consecutive ASCII text characters (very crude approach)
      const textFragments = text.match(/[a-zA-Z0-9\s.,;:'"(){}\[\]-]{5,}/g) || [];
      extractedText = textFragments.join(' ');
    }
    
    return extractedText.trim() || 'Failed to extract readable text from PDF';
  } catch (error) {
    console.error('Error in PDF text extraction:', error);
    return 'Error extracting text from PDF';
  }
}
