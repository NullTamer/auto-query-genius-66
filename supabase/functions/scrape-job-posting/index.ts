
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { extractKeywords } from '../_shared/keywordExtraction.ts';
import { processJobPosting } from '../_shared/jobProcessing.ts';
import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';

// Initialize PDF.js worker
const PDFJS_WORKER_SRC = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

async function extractTextFromPDF(pdfData: ArrayBuffer): Promise<string> {
  try {
    console.log('Loading PDF document...');
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}/${pdf.numPages}`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log('Text extraction complete');
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

function sanitizeText(text: string): string {
  // Remove non-printable characters, excessive whitespace, etc.
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ')                         // Replace multiple spaces with one
    .trim();                                      // Trim leading/trailing spaces
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let jobDescription = '';
    let pdfFile = null;

    // Handle multipart form data (for PDF uploads)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      pdfFile = formData.get('file') as File;
      jobDescription = formData.get('jobDescription') as string || '';

      if (pdfFile) {
        console.log(`Processing PDF file: ${pdfFile.name}`);
        
        try {
          // Extract text from PDF
          const pdfArrayBuffer = await pdfFile.arrayBuffer();
          const extractedText = await extractTextFromPDF(pdfArrayBuffer);
          
          // Sanitize extracted text
          const sanitizedText = sanitizeText(extractedText);
          
          console.log('Extracted text from PDF:', sanitizedText.substring(0, 200) + '...');
          
          // Use extracted text as job description
          jobDescription = sanitizedText;
        } catch (pdfError) {
          console.error('Error processing PDF:', pdfError);
          return new Response(
            JSON.stringify({ success: false, error: `Failed to process PDF: ${pdfError.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      }
    } else {
      // Handle JSON request
      const { jobDescription: jsonJobDesc, userId } = await req.json();
      jobDescription = jsonJobDesc;
    }

    if (!jobDescription || jobDescription.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, error: 'No job description provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Process the job posting
    const { jobId, keywords, error } = await processJobPosting(supabaseAdmin, jobDescription);

    if (error) {
      console.error('Error processing job posting:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the job ID and keywords
    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        keywords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scrape-job-posting function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
