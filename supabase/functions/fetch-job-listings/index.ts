
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  title: string;
  company: string;
  location: string;
  date: string;
  url: string;
  snippet: string;
  source: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, provider } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching job listings for query: "${query}" from provider: ${provider || 'all'}`);
    
    // Common headers for all requests
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    let results: SearchResult[] = [];
    
    // Function to fetch and parse Google Jobs results
    async function fetchGoogleJobs(searchQuery: string): Promise<SearchResult[]> {
      try {
        const encodedQuery = encodeURIComponent(searchQuery);
        const url = `https://www.google.com/search?q=${encodedQuery}&ibp=htl;jobs`;
        
        console.log(`Fetching from Google Jobs: ${url}`);
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from Google Jobs: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Got response from Google Jobs, length: ${html.length}`);
        
        // Extract job data using regex
        const jobElements = html.match(/<div class="PwjeAc">(.*?)<\/div>/gs) || [];
        
        return jobElements.slice(0, 5).map((element, index) => {
          // Extract title
          const titleMatch = element.match(/<h2[^>]*>(.*?)<\/h2>/s);
          const title = titleMatch ? stripTags(titleMatch[1]) : `Job ${index + 1}`;
          
          // Extract company
          const companyMatch = element.match(/<div class="vNEEBe">(.*?)<\/div>/s);
          const company = companyMatch ? stripTags(companyMatch[1]) : 'Unknown Company';
          
          // Extract location
          const locationMatch = element.match(/<div class="Qk80Jf">(.*?)<\/div>/s);
          const location = locationMatch ? stripTags(locationMatch[1]) : '';
          
          // Extract snippet
          const snippetMatch = element.match(/<span class="HBvzbc">(.*?)<\/span>/s);
          const snippet = snippetMatch ? stripTags(snippetMatch[1]) : '';
          
          return {
            title,
            company,
            location,
            date: 'Recent',
            url: `https://www.google.com/search?q=${encodedQuery}&ibp=htl;jobs`,
            snippet: snippet || 'No description available',
            source: 'Google'
          };
        });
      } catch (error) {
        console.error("Error fetching from Google Jobs:", error);
        return [];
      }
    }
    
    // Function to fetch and parse LinkedIn Jobs results
    async function fetchLinkedInJobs(searchQuery: string): Promise<SearchResult[]> {
      try {
        const encodedQuery = encodeURIComponent(searchQuery);
        const url = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;
        
        console.log(`Fetching from LinkedIn: ${url}`);
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from LinkedIn: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Got response from LinkedIn, length: ${html.length}`);
        
        // Extract job listings using regex
        const jobCards = html.match(/<div class="base-card[^>]*>(.*?)<\/div><\/div><\/div>/gs) || [];
        
        return jobCards.slice(0, 5).map((card, index) => {
          // Extract title
          const titleMatch = card.match(/<h3[^>]*>(.*?)<\/h3>/s);
          const title = titleMatch ? stripTags(titleMatch[1]) : `Job ${index + 1}`;
          
          // Extract company
          const companyMatch = card.match(/<h4[^>]*>(.*?)<\/h4>/s);
          const company = companyMatch ? stripTags(companyMatch[1]) : 'Unknown Company';
          
          // Extract location
          const locationMatch = card.match(/<span class="job-search-card__location">(.*?)<\/span>/s);
          const location = locationMatch ? stripTags(locationMatch[1]) : '';
          
          // Extract link
          const linkMatch = card.match(/href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/);
          const url = linkMatch ? linkMatch[1] : `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;
          
          return {
            title,
            company,
            location,
            date: 'Recent',
            url,
            snippet: `${title} at ${company} - ${location}`,
            source: 'LinkedIn'
          };
        });
      } catch (error) {
        console.error("Error fetching from LinkedIn:", error);
        return [];
      }
    }
    
    // Function to fetch and parse Indeed Jobs results
    async function fetchIndeedJobs(searchQuery: string): Promise<SearchResult[]> {
      try {
        const encodedQuery = encodeURIComponent(searchQuery);
        const url = `https://www.indeed.com/jobs?q=${encodedQuery}`;
        
        console.log(`Fetching from Indeed: ${url}`);
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from Indeed: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Got response from Indeed, length: ${html.length}`);
        
        // Extract job listings using regex
        const jobCards = html.match(/<div class="job_seen_beacon">(.*?)<\/div><\/div><\/div><\/div>/gs) || [];
        
        return jobCards.slice(0, 5).map((card, index) => {
          // Extract title
          const titleMatch = card.match(/<h2[^>]*><span[^>]*>(.*?)<\/span><\/h2>/s);
          const title = titleMatch ? stripTags(titleMatch[1]) : `Job ${index + 1}`;
          
          // Extract company
          const companyMatch = card.match(/<span class="companyName">(.*?)<\/span>/s);
          const company = companyMatch ? stripTags(companyMatch[1]) : 'Unknown Company';
          
          // Extract location
          const locationMatch = card.match(/<div class="companyLocation">(.*?)<\/div>/s);
          const location = locationMatch ? stripTags(locationMatch[1]) : '';
          
          // Extract snippet
          const snippetMatch = card.match(/<div class="job-snippet">(.*?)<\/div>/s);
          const snippet = snippetMatch ? stripTags(snippetMatch[1]) : '';
          
          // Extract link
          const linkMatch = card.match(/href="(\/rc\/clk[^"]+)"/);
          const url = linkMatch ? `https://www.indeed.com${linkMatch[1]}` : `https://www.indeed.com/jobs?q=${encodedQuery}`;
          
          return {
            title,
            company,
            location,
            date: 'Recent',
            url,
            snippet: snippet || `${title} at ${company} - ${location}`,
            source: 'Indeed'
          };
        });
      } catch (error) {
        console.error("Error fetching from Indeed:", error);
        return [];
      }
    }
    
    // Helper to strip HTML tags
    function stripTags(html: string): string {
      return html.replace(/<[^>]*>/g, '').trim();
    }

    // Determine which providers to fetch from
    const shouldFetchGoogle = !provider || provider === 'google';
    const shouldFetchLinkedIn = !provider || provider === 'linkedin';
    const shouldFetchIndeed = !provider || provider === 'indeed';
    
    // Fetch from all requested providers
    const promises: Promise<SearchResult[]>[] = [];
    
    if (shouldFetchGoogle) promises.push(fetchGoogleJobs(query));
    if (shouldFetchLinkedIn) promises.push(fetchLinkedInJobs(query));
    if (shouldFetchIndeed) promises.push(fetchIndeedJobs(query));
    
    // Wait for all requests to complete
    const resultsArrays = await Promise.all(promises);
    
    // Combine results
    results = resultsArrays.flat();
    
    // Fallback if no results were found
    if (results.length === 0) {
      console.log("No search results found. Using fallback data.");
      results = [
        {
          title: `${query} Engineer`,
          company: "Tech Company Inc.",
          location: "Remote",
          date: "Today",
          url: "https://example.com/job1",
          snippet: `We are looking for a ${query} engineer with strong programming skills. This position requires experience with modern web technologies.`,
          source: "Fallback"
        },
        {
          title: `Senior ${query} Developer`,
          company: "Innovation Labs",
          location: "New York, NY",
          date: "2 days ago",
          url: "https://example.com/job2",
          snippet: `Senior ${query} Developer needed for a fast-paced team. Must have 5+ years of experience.`,
          source: "Fallback"
        }
      ];
      console.log("Using fallback data:", results);
    } else {
      console.log(`Got ${results.length} real job listings`);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in fetch-job-listings:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        results: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
