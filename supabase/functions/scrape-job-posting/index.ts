
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying fetch... Attempts remaining: ${retries - 1}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

async function extractJobData(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  if (!doc) throw new Error("Failed to parse HTML");

  // Initialize extracted data
  const data = {
    title: "",
    company: "",
    location: "",
    description: "",
    skills: new Set<string>(),
    requirements: new Set<string>()
  };

  try {
    // Extract job title (looking for common job title containers)
    const titleElement = doc.querySelector('h1, .job-title, [data-testid="job-title"]');
    data.title = titleElement?.textContent?.trim() || "Unknown Title";

    // Extract company name
    const companyElement = doc.querySelector('.company-name, [data-testid="company-name"]');
    data.company = companyElement?.textContent?.trim() || "Unknown Company";

    // Extract location
    const locationElement = doc.querySelector('.location, [data-testid="location"]');
    data.location = locationElement?.textContent?.trim() || "Remote";

    // Extract description
    const descriptionElement = doc.querySelector('.job-description, [data-testid="job-description"]');
    data.description = descriptionElement?.textContent?.trim() || "";

    // Extract skills and requirements
    const skillKeywords = [
      "JavaScript", "TypeScript", "Python", "Java", "React", "Angular", "Vue",
      "Node.js", "Express", "Django", "Flask", "SQL", "NoSQL", "AWS", "Azure",
      "Docker", "Kubernetes", "Git", "CI/CD", "REST", "GraphQL"
    ];

    const requirementPhrases = [
      "years of experience",
      "degree in",
      "bachelor's",
      "master's",
      "phd",
      "certification",
      "required skills",
      "must have",
      "responsibilities include"
    ];

    // Search for skills in the description
    const description = data.description.toLowerCase();
    skillKeywords.forEach(skill => {
      if (description.includes(skill.toLowerCase())) {
        data.skills.add(skill);
      }
    });

    // Extract requirements
    const paragraphs = doc.querySelectorAll('p, li');
    paragraphs.forEach(p => {
      const text = p.textContent?.toLowerCase() || "";
      requirementPhrases.forEach(phrase => {
        if (text.includes(phrase)) {
          data.requirements.add(text.trim());
        }
      });
    });

  } catch (error) {
    console.error("Error extracting job data:", error);
  }

  return {
    ...data,
    skills: Array.from(data.skills),
    requirements: Array.from(data.requirements)
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, jobPostingId } = await req.json();

    if (!url || !jobPostingId) {
      throw new Error('Missing required parameters: url and jobPostingId');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting job scraping for URL:', url);

    // Fetch job posting HTML with retry mechanism
    const response = await fetchWithRetry(url);
    const html = await response.text();

    // Extract job data
    const jobData = await extractJobData(html);
    console.log('Extracted job data:', jobData);

    // Update job posting with scraped data
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({
        title: jobData.title,
        description: jobData.description,
        company: jobData.company,
        location: jobData.location,
        status: 'processed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobPostingId);

    if (updateError) throw updateError;

    // Process and store keywords
    const allKeywords = [
      ...jobData.skills.map(skill => ({ keyword: skill, category: 'skill' })),
      ...jobData.requirements.map(req => ({ keyword: req, category: 'requirement' }))
    ];

    if (allKeywords.length > 0) {
      const keywordsToInsert = allKeywords.map(k => ({
        job_posting_id: jobPostingId,
        keyword: k.keyword.toLowerCase(),
        category: k.category,
        frequency: 1,
        created_at: new Date().toISOString()
      }));

      const { error: keywordError } = await supabase
        .from('extracted_keywords')
        .insert(keywordsToInsert);

      if (keywordError) throw keywordError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Job posting processed successfully',
        data: { jobData, keywords: allKeywords }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    
    // If we have a jobPostingId, update its status to failed
    try {
      const { jobPostingId } = await req.json();
      if (jobPostingId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('job_postings')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobPostingId);
      }
    } catch (updateError) {
      console.error('Error updating job posting status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
