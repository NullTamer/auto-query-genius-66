
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing PDF upload request')
    
    const formData = await req.formData()
    const pdfFile = formData.get('pdf')
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      console.error('No PDF file found in request')
      return new Response(
        JSON.stringify({ success: false, error: 'No PDF file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('Uploading PDF to storage')

    // Clean the filename to remove non-ASCII characters
    const originalFileName = pdfFile.name
    const sanitizedFileName = originalFileName.replace(/[^\x00-\x7F]/g, '')
    
    // Generate a unique path for the PDF
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const randomId = crypto.randomUUID()
    const pdfPath = `job-pdfs/${timestamp}-${randomId}.pdf`
    
    // Upload the PDF to Supabase Storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('job_pdfs')
      .upload(pdfPath, pdfFile, {
        contentType: 'application/pdf',
        upsert: false
      })
    
    if (storageError) {
      console.error('Error uploading PDF to storage:', storageError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload PDF file', details: storageError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    console.log('PDF uploaded successfully, creating job posting record')
    
    // Create a new job posting entry
    const { data: jobData, error: jobError } = await supabase
      .from('job_postings')
      .insert({
        status: 'pending',
        pdf_path: pdfPath,
        description: `PDF upload: ${sanitizedFileName}`,
      })
      .select('id')
      .single()
    
    if (jobError) {
      console.error('Error creating job posting record:', jobError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create job record', details: jobError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    const jobId = jobData.id
    console.log('Job posting record created with ID:', jobId)
    
    // Trigger the job-posting scraping function
    const { data: scrapingData, error: scrapingError } = await supabase.functions.invoke('scrape-job-posting', {
      body: { 
        jobId: jobId,
        pdfPath: pdfPath
      }
    })
    
    if (scrapingError) {
      console.error('Error invoking scrape-job-posting function:', scrapingError)
      // We don't return an error here, as the PDF upload was successful
      // The job processing can be retried later
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        jobId: jobId,
        pdfPath: pdfPath,
        fileName: sanitizedFileName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Unexpected error processing request:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
