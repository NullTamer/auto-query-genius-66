
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize PDF.js with worker
const PDFJS = pdfjs;
PDFJS.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the form data to get the PDF file
    const formData = await req.formData();
    const pdfFile = formData.get('file');
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'No PDF file was provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract the file extension and create a unique filename
    const fileExt = pdfFile.name.split('.').pop()?.toLowerCase() || 'pdf';
    const uniqueFilename = `job_${Date.now()}.${fileExt}`;

    // Upload the PDF to Supabase Storage
    const arrayBuffer = await pdfFile.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('job_pdfs')
      .upload(uniqueFilename, arrayBuffer, {
        contentType: pdfFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      throw new Error('Failed to upload PDF to storage');
    }

    // Now let's extract text from the PDF
    try {
      const pdfData = new Uint8Array(arrayBuffer);
      const loadingTask = PDFJS.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      
      let extractedText = '';
      
      // Extract text from each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => (item as any).str)
          .join(' ');
        
        extractedText += pageText + '\n';
      }

      return new Response(
        JSON.stringify({ 
          text: extractedText,
          message: "PDF processing completed successfully",
          filename: uniqueFilename
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (pdfError) {
      console.error('PDF extraction error:', pdfError);
      
      // If extraction fails, return a more informative error
      return new Response(
        JSON.stringify({ 
          error: 'Failed to extract text from PDF',
          details: pdfError.message,
          message: "PDF processing failed"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('General error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function createClient(supabaseUrl, supabaseKey) {
  const { createClient } = require('https://esm.sh/@supabase/supabase-js@2');
  return createClient(supabaseUrl, supabaseKey);
}
