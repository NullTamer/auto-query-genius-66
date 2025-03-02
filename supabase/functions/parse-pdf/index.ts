
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { extract } from "https://deno.land/x/pdf@v0.1.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting PDF processing");
    const formData = await req.formData();
    const pdfFile = formData.get('pdf');

    if (!pdfFile) {
      return new Response(
        JSON.stringify({ success: false, error: 'No PDF file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing PDF file: ${pdfFile.name}, size: ${pdfFile.size} bytes`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Ensure storage bucket exists
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('pdf_uploads');
    if (bucketError && bucketError.message.includes('The resource was not found')) {
      const { error: createBucketError } = await supabase.storage.createBucket('pdf_uploads', {
        public: false,
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create storage bucket', details: createBucketError }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    // Generate a unique ID for the PDF file (not using crypto.randomUUID)
    // Using timestamp + random number instead
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const fileId = `${timestamp}_${random}`;
    
    // Get file extension
    const fileExt = pdfFile.name.split('.').pop() || 'pdf';
    
    // Create a unique path for the file
    const filePath = `uploads/${fileId}.${fileExt}`;

    // Upload the PDF file to Storage
    const { error: uploadError } = await supabase.storage
      .from('pdf_uploads')
      .upload(filePath, pdfFile, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload PDF file', details: uploadError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get the PDF file from Storage to process it
    const { data: fileData, error: fileError } = await supabase.storage
      .from('pdf_uploads')
      .download(filePath);

    if (fileError || !fileData) {
      console.error('Error downloading file for processing:', fileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to download PDF for processing', details: fileError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Extract text from the PDF
    let pdfText = '';
    try {
      const pdfBytes = await fileData.arrayBuffer();
      const data = await extract(new Uint8Array(pdfBytes));
      pdfText = data.text || '';
      
      console.log('Successfully extracted PDF text, length:', pdfText.length);
      
      if (!pdfText || pdfText.length < 10) {
        console.warn('Extracted text is too short or empty:', pdfText);
        return new Response(
          JSON.stringify({ success: false, error: 'PDF text extraction failed or resulted in empty content' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } catch (extractError) {
      console.error('Error extracting PDF text:', extractError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to extract text from PDF', details: extractError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create a job posting record for the PDF
    const { data: jobData, error: jobError } = await supabase
      .from('job_postings')
      .insert({
        content: pdfText,
        description: `PDF Upload: ${pdfFile.name}`,
        status: 'pending',
        pdf_path: filePath,
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('Error creating job posting:', jobError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create job posting record', details: jobError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const jobId = jobData.id;

    // Process the text to extract keywords
    // Invoke a local function to extract keywords
    const keywords = await extractKeywords(pdfText);

    // Store extracted keywords
    if (keywords && keywords.length > 0) {
      const keywordObjects = keywords.map(k => ({
        job_posting_id: jobId,
        keyword: k.keyword,
        frequency: k.frequency || 1
      }));

      const { error: keywordError } = await supabase
        .from('extracted_keywords')
        .insert(keywordObjects);

      if (keywordError) {
        console.error('Error storing keywords:', keywordError);
        // Continue processing despite keyword storage error
      }
    }

    // Update job posting status to processed
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({ 
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('Error updating job status:', updateError);
      // Continue despite update error
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobId,
        keywords: keywords,
        pdfPath: filePath,
        fileName: pdfFile.name,
        message: 'PDF processed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in parse-pdf function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Simplified keyword extraction function
async function extractKeywords(text: string) {
  try {
    // Extract common job-related keywords
    const commonKeywords = [
      'experience', 'skills', 'requirements', 'qualifications', 'responsibilities',
      'education', 'degree', 'bachelor', 'master', 'phd', 'certification',
      'knowledge', 'proficiency', 'familiar', 'expert', 'intermediate', 'advanced',
      'years', 'background', 'professional', 'technical', 'analytical', 'communication'
    ];

    // Generate a simple frequency map
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const freqMap: Record<string, number> = {};

    words.forEach(word => {
      if (commonKeywords.includes(word) || word.length > 4) {
        freqMap[word] = (freqMap[word] || 0) + 1;
      }
    });

    // Convert to keyword array and sort by frequency
    const keywords = Object.entries(freqMap)
      .filter(([word, freq]) => freq > 1) // Only include words with frequency > 1
      .map(([keyword, frequency]) => ({ keyword, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50); // Limit to top 50 keywords

    return keywords;
  } catch (error) {
    console.error('Error extracting keywords:', error);
    return [];
  }
}
