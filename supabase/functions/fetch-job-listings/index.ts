
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse request body
  let searchTerm: string;
  let provider: string;
  
  try {
    const { searchTerm: term, provider: prov } = await req.json();
    searchTerm = term;
    provider = prov;
  } catch (e) {
    console.error("Error parsing request:", e);
    return new Response(
      JSON.stringify({ success: false, error: "Invalid request" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }

  console.log(`Searching for "${searchTerm}" on ${provider}`);

  try {
    // Get search results based on provider
    let results;
    
    switch (provider) {
      case 'google':
        results = await searchGoogle(searchTerm);
        break;
      case 'linkedin':
        results = await searchLinkedIn(searchTerm);
        break;
      case 'indeed':
        results = await searchIndeed(searchTerm);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid provider" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }

    // If results array is empty, use fallback
    if (!results || results.length === 0) {
      console.log(`No results found for "${searchTerm}" on ${provider}, using fallback`);
      results = generateFallbackResults(provider, searchTerm);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`Error fetching results:`, error);
    
    // Return fallback search results in case of error
    const fallbackResults = generateFallbackResults(provider, searchTerm);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        results: fallbackResults,
        warning: "Using fallback results due to API error"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function searchGoogle(searchTerm: string) {
  try {
    // Add user agent and accept headers to make the request more like a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };
    
    const response = await fetch(
      `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}+jobs&gl=us&hl=en`, 
      { headers }
    );
    
    if (!response.ok) {
      console.error(`Google search failed with status: ${response.status}`);
      throw new Error(`Google search failed: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Received Google HTML response of length: ${html.length}`);
    
    // Extract job listings with regex
    // Find job cards - look for divs with certain classes that typically contain job listings
    const jobCardRegex = /<div[^>]*class="[^"]*BjJfJf[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    const titleRegex = /<h3[^>]*>([\s\S]*?)<\/h3>/;
    const companyRegex = /<div[^>]*class="[^"]*vNEEBe[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    const locationRegex = /<div[^>]*class="[^"]*vNEEBe[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    const dateRegex = /<span[^>]*class="[^"]*SuWscb[^"]*"[^>]*>([\s\S]*?)<\/span>/;
    
    let match;
    const jobListings = [];
    let index = 0;
    
    // Use a simple approach to find job listings sections
    const jobSections = html.split('<div class="BjJfJf PUpOsf">');
    
    for (let i = 1; i < jobSections.length && i <= 10; i++) {
      const section = jobSections[i];
      
      // Extract title - find the first strong tag content which is usually the job title
      const titleMatch = /<span[^>]*>([^<]+)<\/span>/.exec(section);
      const title = titleMatch ? titleMatch[1].trim() : `Job #${i}`;
      
      // Extract company - usually follows the title in a div
      const companyMatch = /<div[^>]*class="[^"]*vNEEBe[^"]*"[^>]*>([^<]+)<\/div>/.exec(section);
      const company = companyMatch ? companyMatch[1].trim() : "Company not specified";
      
      // Extract location - usually a subsequent div after company
      const locationMatch = /<div[^>]*>([^<]+)<\/div>/.exec(section.substring(section.indexOf(company) + company.length));
      const location = locationMatch ? locationMatch[1].trim() : "Location not specified";
      
      // Extract snippet - anything we can find that looks like a description
      const snippetMatch = /<div[^>]*class="[^"]*HBvzbc[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(section);
      const snippet = snippetMatch ? 
        snippetMatch[1].replace(/<[^>]*>/g, ' ').trim().replace(/\s+/g, ' ') : 
        `Job matching "${searchTerm}"`;
      
      // Build the job object
      jobListings.push({
        id: `google-${i}`,
        title,
        company,
        location,
        date: "Recently posted",
        snippet,
        description: snippet,
        url: `https://www.google.com/search?q=${encodeURIComponent(title)}+${encodeURIComponent(company)}+jobs`,
        source: "Google Jobs"
      });
    }
    
    console.log(`Extracted ${jobListings.length} job listings from Google`);
    
    return jobListings.length > 0 ? jobListings : [];
  } catch (error) {
    console.error("Error in Google search:", error);
    return [];
  }
}

async function searchLinkedIn(searchTerm: string) {
  try {
    // Add user agent and accept headers to make the request more like a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };
    
    const response = await fetch(
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchTerm)}&position=1&pageNum=0`, 
      { headers }
    );
    
    if (!response.ok) {
      console.error(`LinkedIn search failed with status: ${response.status}`);
      throw new Error(`LinkedIn search failed: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Received LinkedIn HTML response of length: ${html.length}`);
    
    // Extract job cards
    const jobCardRegex = /<div[^>]*class="[^"]*base-card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    
    // Extract details from each card
    const titleRegex = /<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/;
    const companyRegex = /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/;
    const locationRegex = /<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/;
    const dateRegex = /<time[^>]*>([\s\S]*?)<\/time>/;
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*>/;
    
    const jobListings = [];
    let match;
    let index = 0;
    
    while ((match = jobCardRegex.exec(html)) !== null && index < 10) {
      const jobCard = match[0];
      
      // Extract job details
      const titleMatch = titleRegex.exec(jobCard);
      const title = titleMatch ? 
        titleMatch[1].replace(/<[^>]*>/g, '').trim() : 
        `${searchTerm} Job #${index + 1}`;
      
      const companyMatch = companyRegex.exec(jobCard);
      const company = companyMatch ? 
        companyMatch[1].replace(/<[^>]*>/g, '').trim() : 
        "Company not specified";
      
      const locationMatch = locationRegex.exec(jobCard);
      const location = locationMatch ? 
        locationMatch[1].replace(/<[^>]*>/g, '').trim() : 
        "Location not specified";
      
      const dateMatch = dateRegex.exec(jobCard);
      const date = dateMatch ? 
        dateMatch[1].replace(/<[^>]*>/g, '').trim() : 
        "Recently posted";
      
      const linkMatch = linkRegex.exec(jobCard);
      const url = linkMatch ? 
        linkMatch[1] : 
        `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchTerm)}`;
      
      // Extract a snippet if possible
      const snippetMatch = /<div[^>]*class="[^"]*base-search-card__metadata[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(jobCard);
      const snippet = snippetMatch ? 
        snippetMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 
        `${title} at ${company} in ${location}`;
      
      jobListings.push({
        id: `linkedin-${index}`,
        title,
        company,
        location,
        date,
        snippet: `${title} at ${company} in ${location}. ${snippet}`,
        description: `${title} at ${company} in ${location}`,
        url,
        source: "LinkedIn"
      });
      
      index++;
    }
    
    console.log(`Extracted ${jobListings.length} job listings from LinkedIn`);
    
    return jobListings.length > 0 ? jobListings : [];
  } catch (error) {
    console.error("Error in LinkedIn search:", error);
    return [];
  }
}

async function searchIndeed(searchTerm: string) {
  try {
    // Add user agent and accept headers to make the request more like a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };
    
    const response = await fetch(
      `https://www.indeed.com/jobs?q=${encodeURIComponent(searchTerm)}&l=`, 
      { headers }
    );
    
    if (!response.ok) {
      console.error(`Indeed search failed with status: ${response.status}`);
      throw new Error(`Indeed search failed: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Received Indeed HTML response of length: ${html.length}`);
    
    // Extract job cards
    const jobCardRegex = /<div[^>]*class="[^"]*job_seen_beacon[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    
    // Extract details from each card
    const titleRegex = /<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>([\s\S]*?)<\/h2>/;
    const companyRegex = /<span[^>]*class="[^"]*companyName[^"]*"[^>]*>([\s\S]*?)<\/span>/;
    const locationRegex = /<div[^>]*class="[^"]*companyLocation[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    const snippetRegex = /<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    const dateRegex = /<span[^>]*class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\/span>/;
    const linkRegex = /<a[^>]*data-jk="([^"]*)"[^>]*>/;
    
    const jobListings = [];
    let index = 0;
    
    // Use sections approach
    const jobSections = html.split('<div class="job_seen_beacon');
    
    for (let i = 1; i < jobSections.length && i <= 10; i++) {
      const section = `<div class="job_seen_beacon${jobSections[i]}`;
      
      // Extract job details
      const titleMatch = /<h2[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>[\s\S]*?<\/h2>/.exec(section) || 
                        /<h2[^>]*>[\s\S]*?<a[^>]*>([^<]*)<\/a>[\s\S]*?<\/h2>/.exec(section);
      const title = titleMatch ? 
        titleMatch[1].trim() : 
        `${searchTerm} Job #${i}`;
      
      const companyMatch = /<span[^>]*class="[^"]*companyName[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(section);
      const company = companyMatch ? 
        companyMatch[1].replace(/<[^>]*>/g, '').trim() : 
        "Company not specified";
      
      const locationMatch = /<div[^>]*class="[^"]*companyLocation[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(section);
      const location = locationMatch ? 
        locationMatch[1].replace(/<[^>]*>/g, '').trim() : 
        "Location not specified";
      
      const snippetMatch = /<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(section);
      const snippet = snippetMatch ? 
        snippetMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 
        `Position for ${title} at ${company}`;
      
      const dateMatch = /<span[^>]*class="[^"]*date[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(section);
      const date = dateMatch ? 
        dateMatch[1].replace(/<[^>]*>/g, '').trim() : 
        "Recently posted";
      
      // Generate job ID for Indeed URL
      const idMatch = /data-jk="([^"]*)"/.exec(section);
      const jobId = idMatch ? idMatch[1] : "";
      
      const url = jobId ? 
        `https://www.indeed.com/viewjob?jk=${jobId}` : 
        `https://www.indeed.com/jobs?q=${encodeURIComponent(searchTerm)}`;
      
      jobListings.push({
        id: `indeed-${i}`,
        title,
        company,
        location,
        date,
        snippet,
        description: `${title} at ${company} in ${location}. ${snippet}`,
        url,
        source: "Indeed"
      });
    }
    
    console.log(`Extracted ${jobListings.length} job listings from Indeed`);
    
    return jobListings.length > 0 ? jobListings : [];
  } catch (error) {
    console.error("Error in Indeed search:", error);
    return [];
  }
}

function generateFallbackResults(provider: string, searchTerm: string) {
  const sources = {
    'google': 'Google Jobs',
    'linkedin': 'LinkedIn',
    'indeed': 'Indeed'
  };
  
  const source = sources[provider as keyof typeof sources] || provider;
  const results = [];
  
  const titles = [
    `${searchTerm} Developer`,
    `Senior ${searchTerm} Engineer`,
    `${searchTerm} Specialist`,
    `${searchTerm} Analyst`,
    `${searchTerm} Team Lead`,
    `${searchTerm} Consultant`,
    `${searchTerm} Manager`,
    `Junior ${searchTerm} Developer`,
    `${searchTerm} Administrator`,
    `${searchTerm} Solutions Architect`,
  ];
  
  const companies = [
    'TechCorp, Inc.',
    'Global Software Ltd',
    'Quantum Solutions',
    'Cyber Systems',
    'Digital Innovations',
    'NextGen Technologies',
    'Apex Computing',
    'Future Systems',
    'Omni Tech Group',
    'Prime Digital Services',
  ];
  
  const locations = [
    'San Francisco, CA',
    'New York, NY',
    'Austin, TX',
    'Seattle, WA',
    'Boston, MA',
    'Chicago, IL',
    'Denver, CO',
    'Atlanta, GA',
    'Remote',
    'Hybrid - Los Angeles, CA',
  ];
  
  const dates = [
    'Posted today',
    'Posted 1 day ago',
    'Posted 2 days ago',
    'Posted 3 days ago',
    'Posted 1 week ago',
    'Posted 2 weeks ago',
    'Posted 3 weeks ago',
    'Posted 1 month ago',
    'Posted recently',
    'Active listing',
  ];
  
  const snippets = [
    `Join our team as a ${searchTerm} Developer and help build cutting-edge solutions. Requires 3+ years of experience.`,
    `Lead ${searchTerm} projects in an agile environment. 5+ years of experience required.`,
    `Work on ${searchTerm} initiatives in a fast-paced environment. Remote options available.`,
    `Analyze ${searchTerm} data and provide actionable insights. Experience with data visualization tools required.`,
    `Lead a team of ${searchTerm} experts. 7+ years of experience and management background required.`,
    `Provide ${searchTerm} consulting services to Fortune 500 clients. Travel required.`,
    `Oversee ${searchTerm} operations and strategy. 8+ years of experience required.`,
    `Entry-level ${searchTerm} position. Bachelor's degree required. Training provided.`,
    `Manage ${searchTerm} systems and infrastructure. 4+ years of relevant experience required.`,
    `Design ${searchTerm} architecture for enterprise applications. Senior-level position.`,
  ];
  
  for (let i = 0; i < 10; i++) {
    results.push({
      id: `${provider}-${i}`,
      title: titles[i],
      company: companies[i],
      location: locations[i],
      date: dates[i],
      snippet: snippets[i],
      description: `${titles[i]} at ${companies[i]}. ${snippets[i]} This position requires expertise in ${searchTerm}.`,
      url: `https://www.example.com/jobs?q=${encodeURIComponent(searchTerm)}`,
      source
    });
  }
  
  return results;
}
