
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractJobData(description: string) {
  // Initialize extracted data
  const data = {
    title: "Job Position",
    company: "Company",
    location: "Location",
    description: description,
    skills: new Set<string>(),
    requirements: new Set<string>()
  };

  const skillKeywords = [
    "JavaScript", "TypeScript", "Python", "Java", "React", "Angular", "Vue",
    "Node.js", "Express", "Django", "Flask", "SQL", "NoSQL", "AWS", "Azure",
    "Docker", "Kubernetes", "Git", "CI/CD", "REST", "GraphQL", "HTML", "CSS",
    "DevOps", "Agile", "Scrum", "Testing", "API", "Frontend", "Backend",
    "Full Stack", "Cloud", "Database", "Security", "Linux", "Mobile"
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

  // Convert description to lowercase for case-insensitive matching
  const descriptionLower = description.toLowerCase();

  // Extract skills
  skillKeywords.forEach(skill => {
    if (descriptionLower.includes(skill.toLowerCase())) {
      data.skills.add(skill);
    }
  });

  // Extract requirements
  const sentences = description.split(/[.!?]+/);
  sentences.forEach(sentence => {
    const sentenceLower = sentence.toLowerCase().trim();
    requirementPhrases.forEach(phrase => {
      if (sentenceLower.includes(phrase)) {
        data.requirements.add(sentence.trim());
      }
    });
  });

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
    const { jobDescription, jobPostingId } = await req.json();

    if (!jobDescription || !jobPostingId) {
      throw new Error('Missing required parameters: jobDescription and jobPostingId');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting job processing...');

    // Extract job data
    const jobData = extractJobData(jobDescription);
    console.log('Extracted job data:', jobData);

    // Update job posting with processed data
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
      ...jobData.skills.map(skill => ({ keyword: skill, category: 'skill', frequency: 2 })),
      ...jobData.requirements.map(req => ({ keyword: req, category: 'requirement', frequency: 1 }))
    ];

    if (allKeywords.length > 0) {
      const keywordsToInsert = allKeywords.map(k => ({
        job_posting_id: jobPostingId,
        keyword: k.keyword,
        category: k.category,
        frequency: k.frequency,
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
