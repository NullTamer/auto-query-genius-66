
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { searchTerm, provider } = await req.json();
    console.log(`Searching for "${searchTerm}" on ${provider}`);

    // Sanitize the search term for API requests
    const sanitizedSearchTerm = encodeURIComponent(searchTerm);
    let results = [];

    // Get current date for "posted X days ago" calculation
    const now = new Date();

    switch (provider) {
      case "linkedin":
        // Real implementation would call LinkedIn API, but we'll simulate with realistic data
        results = [
          {
            title: `Senior ${searchTerm.split(' ')[0]} Developer`,
            company: "Tech Innovations Inc",
            location: "Remote / San Francisco",
            date: `Posted ${Math.floor(Math.random() * 7) + 1} days ago`,
            url: `https://www.linkedin.com/jobs/view/${Math.floor(Math.random() * 10000000)}`,
            snippet: `We're looking for a skilled professional with expertise in ${searchTerm}. Join our team of dedicated professionals working on cutting-edge solutions.`
          },
          {
            title: `${searchTerm.split(' ')[0]} Engineer`,
            company: "Global Systems Ltd",
            location: "New York / Remote",
            date: `Posted ${Math.floor(Math.random() * 14) + 1} days ago`,
            url: `https://www.linkedin.com/jobs/view/${Math.floor(Math.random() * 10000000)}`,
            snippet: `Exciting opportunity for a ${searchTerm} specialist to join our growing team. We offer competitive salary and benefits.`
          },
          {
            title: `Lead ${searchTerm.split(' ')[0]} Architect`,
            company: "Innovative Solutions",
            location: "Austin, TX",
            date: "Posted today",
            url: `https://www.linkedin.com/jobs/view/${Math.floor(Math.random() * 10000000)}`,
            snippet: `Join our team to lead projects involving ${searchTerm}. Must have 5+ years of experience and strong leadership skills.`
          }
        ];
        break;

      case "indeed":
        // Real implementation would call Indeed API, but we'll simulate with realistic data
        results = [
          {
            title: `${searchTerm.split(' ')[0]} Specialist`,
            company: "Enterprise Tech",
            location: "Chicago / Remote",
            date: `Posted ${Math.floor(Math.random() * 10) + 1} days ago`,
            url: `https://www.indeed.com/viewjob?jk=${Math.random().toString(36).substring(2, 10)}`,
            snippet: `We are seeking a talented individual with experience in ${searchTerm} to join our innovative team.`
          },
          {
            title: `Senior ${searchTerm.split(' ')[0]} Developer`,
            company: "Tech Solutions Inc",
            location: "Seattle, WA",
            date: `Posted ${Math.floor(Math.random() * 5) + 1} days ago`,
            url: `https://www.indeed.com/viewjob?jk=${Math.random().toString(36).substring(2, 10)}`,
            snippet: `Looking for a developer experienced in ${searchTerm} to help build our next generation platform.`
          },
          {
            title: `${searchTerm.split(' ')[0]} Consultant`,
            company: "Consulting Partners",
            location: "Denver, CO",
            date: "Posted yesterday",
            url: `https://www.indeed.com/viewjob?jk=${Math.random().toString(36).substring(2, 10)}`,
            snippet: `Join our consulting team to work with clients on ${searchTerm} solutions. Travel required.`
          }
        ];
        break;

      case "google":
      default:
        // Real implementation would call Google Jobs API, but we'll simulate with realistic data
        results = [
          {
            title: `${searchTerm.split(' ')[0]} Expert`,
            company: "Digital Frontiers",
            location: "Remote / Boston",
            date: `Posted ${Math.floor(Math.random() * 8) + 1} days ago`,
            url: `https://www.google.com/search?q=${sanitizedSearchTerm}+jobs`,
            snippet: `We're seeking an expert in ${searchTerm} to join our team and lead development efforts on our core platforms.`
          },
          {
            title: `${searchTerm.split(' ')[0]} Developer`,
            company: "Future Technologies",
            location: "San Jose, CA",
            date: `Posted ${Math.floor(Math.random() * 3) + 1} days ago`,
            url: `https://www.google.com/search?q=${sanitizedSearchTerm}+jobs`,
            snippet: `Join our team working on cutting-edge solutions using ${searchTerm}. Excellent benefits and growth opportunities.`
          },
          {
            title: `${searchTerm.split(' ')[0]} Team Lead`,
            company: "Innovative Solutions Inc",
            location: "Atlanta, GA",
            date: "Posted today",
            url: `https://www.google.com/search?q=${sanitizedSearchTerm}+jobs`,
            snippet: `Looking for a technical lead with experience in ${searchTerm} to drive our product development forward.`
          }
        ];
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error fetching job listings:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
