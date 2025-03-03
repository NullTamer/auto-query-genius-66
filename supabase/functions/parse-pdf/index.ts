
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request for CORS preflight');
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Only process POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    console.log('Processing PDF upload request');
    
    // Get formData from request
    const formData = await req.formData();
    const file = formData.get('pdf');
    
    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'No PDF file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing PDF file: ${file.name}, Size: ${file.size} bytes`);

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check if storage bucket exists, create if not
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'job_pdfs')) {
      console.log('Creating job_pdfs bucket');
      await supabaseAdmin.storage.createBucket('job_pdfs', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const uniqueFileName = `${timestamp}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    const filePath = `uploads/${uniqueFileName}`;

    console.log(`Uploading to storage path: ${filePath}`);

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('job_pdfs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('job_pdfs')
      .getPublicUrl(filePath);

    // Extract PDF text using an API or service
    console.log('Extracting text from PDF...');
    
    // Simulate PDF text extraction for now
    // In a real application, you would use a PDF parsing library or API
    const extractedText = `This is extracted text from the PDF file "${file.name}". 
    In a real application, this would contain the actual content of the PDF.
    For now, we're simulating the extraction process so you can see how the workflow functions.`;

    console.log('Creating job entry in database');
    
    // Create job posting entry
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('job_postings')
      .insert({
        original_text: extractedText,
        status: 'processing',
        source: 'pdf_upload',
        is_public: true,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          pdfPath: filePath,
          publicUrl: publicUrlData.publicUrl
        }
      })
      .select()
      .single();

    if (jobError) {
      console.error('Database job creation error:', jobError);
      throw new Error(`Failed to create job entry: ${jobError.message}`);
    }

    // Process keywords (simplified for demonstration)
    const keywords = [
      { keyword: "PDF Upload", frequency: 3 },
      { keyword: "Sample", frequency: 2 },
      { keyword: "Test", frequency: 1 }
    ];

    // Insert keywords
    if (keywords.length > 0) {
      console.log('Inserting keywords:', keywords);
      
      const keywordEntries = keywords.map(k => ({
        job_posting_id: jobData.id,
        keyword: k.keyword,
        frequency: k.frequency,
        is_public: true
      }));

      const { error: keywordError } = await supabaseAdmin
        .from('extracted_keywords')
        .insert(keywordEntries);

      if (keywordError) {
        console.error('Keyword insertion error:', keywordError);
        // We'll continue even if keyword insertion fails
      }
    }

    // Update job status to completed
    await supabaseAdmin
      .from('job_postings')
      .update({ status: 'completed' })
      .eq('id', jobData.id);

    console.log('PDF processing completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: "PDF processed successfully",
        jobId: jobData.id,
        pdfPath: filePath,
        extractedText: extractedText,
        keywords: keywords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error processing PDF:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
