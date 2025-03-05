
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
    const { searchTerm, provider } = await req.json();
    
    if (!searchTerm) {
      return new Response(
        JSON.stringify({ error: 'Search term is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching job listings for term: "${searchTerm}" from provider: ${provider || 'all'}`);
    
    // Extended headers for more reliable scraping
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'sec-ch-ua': '"Google Chrome";v="123", "Chromium";v="123", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    };

    let results: SearchResult[] = [];
    
    // Improved function to fetch and parse Google Jobs results
    async function fetchGoogleJobs(searchQuery: string): Promise<SearchResult[]> {
      try {
        const encodedQuery = encodeURIComponent(searchQuery + " jobs");
        const url = `https://www.google.com/search?q=${encodedQuery}&ibp=htl;jobs`;
        
        console.log(`Fetching from Google Jobs: ${url}`);
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from Google Jobs: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Google HTML length: ${html.length}`);
        
        // Track if we've successfully extracted job data
        let extractedJobs = false;
        let results: SearchResult[] = [];
        
        // Try multiple regex patterns to extract job data
        const patterns = [
          {
            title: /<h2[^>]*class="[^"]*BjJfJf[^"]*"[^>]*>(.*?)<\/h2>/gs,
            company: /<div[^>]*class="[^"]*vNEEBe[^"]*"[^>]*>(.*?)<\/div>/gs,
            location: /<div[^>]*class="[^"]*Qk80Jf[^"]*"[^>]*>(.*?)<\/div>/gs,
            snippet: /<span[^>]*class="[^"]*HBvzbc[^"]*"[^>]*>(.*?)<\/span>/gs,
          },
          {
            title: /<h3[^>]*>(.*?)<\/h3>/gs,
            company: /<div[^>]*class="[^"]*company[^"]*"[^>]*>(.*?)<\/div>/gs,
            location: /<div[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/div>/gs,
            snippet: /<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/gs,
          }
        ];
        
        for (const pattern of patterns) {
          const jobTitles = html.match(pattern.title) || [];
          const companies = html.match(pattern.company) || [];
          const locations = html.match(pattern.location) || [];
          const snippets = html.match(pattern.snippet) || [];
          
          console.log(`Pattern match results - Titles: ${jobTitles.length}, Companies: ${companies.length}`);
          
          if (jobTitles.length > 0 && companies.length > 0) {
            extractedJobs = true;
            
            // Create job listings from the extracted data
            for (let i = 0; i < Math.min(jobTitles.length, 10); i++) {
              const title = stripTags(jobTitles[i] || `Job ${i+1}`);
              const company = stripTags(companies[i] || "Unknown Company");
              const location = locations[i] ? stripTags(locations[i]) : "Remote";
              const snippet = snippets[i] ? stripTags(snippets[i]) : `${title} position at ${company}`;
              
              results.push({
                title,
                company,
                location,
                date: "Recent",
                url: `https://www.google.com/search?q=${encodedQuery}`,
                snippet,
                source: "Google"
              });
            }
            
            break; // Stop trying patterns if we found job data
          }
        }
        
        // If no jobs extracted with regex patterns, use search term to create alternative results
        if (!extractedJobs) {
          console.log("No job data extracted from Google HTML, creating alternative results");
          // Create job listings based on search query terms
          const terms = searchQuery.split(" ");
          const roles = ["Developer", "Engineer", "Specialist", "Manager", "Consultant"];
          const companies = ["TechCorp", "InnoSys", "DevWorks", "GlobalTech", "FutureIT"];
          const locations = ["Remote", "New York, NY", "San Francisco, CA", "Austin, TX", "Seattle, WA"];
          
          for (let i = 0; i < 5; i++) {
            const title = `${terms[0]} ${roles[i % roles.length]}`;
            const company = companies[i % companies.length];
            const location = locations[i % locations.length];
            
            results.push({
              title,
              company,
              location,
              date: "Recent",
              url: `https://www.google.com/search?q=${encodedQuery}`,
              snippet: `Join our team as a ${title} at ${company}. We're looking for talented professionals with experience in ${terms.join(", ")}.`,
              source: "Alternative"
            });
          }
        }
        
        return results;
      } catch (error) {
        console.error("Error fetching from Google Jobs:", error);
        return [];
      }
    }
    
    // Improved LinkedIn Jobs fetching function
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
        console.log(`LinkedIn HTML length: ${html.length}`);
        
        // Extract job cards with improved regex
        const jobCards = html.match(/<div class="base-card[^>]*>(.*?)<\/div><\/div><\/div>/gs) || [];
        console.log(`LinkedIn job cards found: ${jobCards.length}`);
        
        if (jobCards.length > 0) {
          return jobCards.slice(0, 5).map((card, index) => {
            // Extract title with more specific regex
            const titleMatch = card.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>(.*?)<\/h3>/s);
            const title = titleMatch ? stripTags(titleMatch[1]) : `Job ${index + 1}`;
            
            // Extract company
            const companyMatch = card.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>(.*?)<\/h4>/s);
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
        } else {
          // Alternative approach - generate from search terms
          console.log("No LinkedIn job cards found, creating alternative results");
          const terms = searchQuery.split(" ");
          const results: SearchResult[] = [];
          
          for (let i = 0; i < 5; i++) {
            results.push({
              title: `${terms[0]} ${["Specialist", "Professional", "Expert", "Lead", "Consultant"][i]}`,
              company: ["LinkedIn Corp", "TechVision", "InnoTech", "FutureSolutions", "GlobalNet"][i],
              location: ["Remote", "New York, NY", "San Francisco, CA", "Boston, MA", "Chicago, IL"][i],
              date: 'Recent',
              url: `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`,
              snippet: `Exciting opportunity for a ${terms.join(" ")} professional. Join our growing team!`,
              source: 'Alternative LinkedIn'
            });
          }
          
          return results;
        }
      } catch (error) {
        console.error("Error fetching from LinkedIn:", error);
        return [];
      }
    }
    
    // Improved Indeed Jobs fetching function
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
        console.log(`Indeed HTML length: ${html.length}`);
        
        // Extract job listings with improved regex patterns
        let jobCards = html.match(/<div class="job_seen_beacon">(.*?)<\/div><\/div><\/div><\/div>/gs);
        
        // Alternative pattern if first one doesn't match
        if (!jobCards || jobCards.length === 0) {
          jobCards = html.match(/<div class="jobsearch-SerpJobCard[^>]*>(.*?)<\/div><\/div><\/div>/gs);
        }
        
        // Another alternative pattern
        if (!jobCards || jobCards.length === 0) {
          jobCards = html.match(/<div data-testid="jobCardList-jobCard[^>]*>(.*?)<\/div><\/div><\/div>/gs);
        }
        
        console.log(`Indeed job cards found: ${jobCards ? jobCards.length : 0}`);
        
        if (jobCards && jobCards.length > 0) {
          return jobCards.slice(0, 5).map((card, index) => {
            // Extract title with multiple pattern attempts
            let titleMatch = card.match(/<h2[^>]*class="jobTitle[^"]*"[^>]*>(.*?)<\/h2>/s);
            if (!titleMatch) {
              titleMatch = card.match(/<a[^>]*class="jobtitle[^"]*"[^>]*>(.*?)<\/a>/s);
            }
            if (!titleMatch) {
              titleMatch = card.match(/<h2[^>]*><span[^>]*>(.*?)<\/span><\/h2>/s);
            }
            const title = titleMatch ? stripTags(titleMatch[1]) : `Job ${index + 1}`;
            
            // Extract company with multiple pattern attempts
            let companyMatch = card.match(/<span class="companyName">(.*?)<\/span>/s);
            if (!companyMatch) {
              companyMatch = card.match(/<div class="company">(.*?)<\/div>/s);
            }
            const company = companyMatch ? stripTags(companyMatch[1]) : 'Unknown Company';
            
            // Extract location with multiple pattern attempts
            let locationMatch = card.match(/<div class="companyLocation">(.*?)<\/div>/s);
            if (!locationMatch) {
              locationMatch = card.match(/<div class="location">(.*?)<\/div>/s);
            }
            const location = locationMatch ? stripTags(locationMatch[1]) : '';
            
            // Extract snippet
            let snippetMatch = card.match(/<div class="job-snippet">(.*?)<\/div>/s);
            if (!snippetMatch) {
              snippetMatch = card.match(/<div class="summary">(.*?)<\/div>/s);
            }
            const snippet = snippetMatch ? stripTags(snippetMatch[1]) : '';
            
            return {
              title,
              company,
              location,
              date: 'Recent',
              url: `https://www.indeed.com/jobs?q=${encodedQuery}`,
              snippet: snippet || `${title} at ${company} - ${location}`,
              source: 'Indeed'
            };
          });
        } else {
          // Alternative approach - generate from search terms
          console.log("No Indeed job cards found, creating alternative results");
          const terms = searchQuery.split(" ");
          const results: SearchResult[] = [];
          
          for (let i = 0; i < 5; i++) {
            results.push({
              title: `${["Senior", "Junior", "Mid-level", "Contract", "Freelance"][i]} ${terms.join(" ")}`,
              company: ["Indeed Solutions", "WorkPlace Inc", "JobCorp", "CareerPath", "TalentHub"][i],
              location: ["Remote", "Chicago, IL", "Austin, TX", "Seattle, WA", "Denver, CO"][i],
              date: 'Recent',
              url: `https://www.indeed.com/jobs?q=${encodedQuery}`,
              snippet: `Great opportunity for a ${terms.join(" ")} professional. Competitive salary and benefits.`,
              source: 'Alternative Indeed'
            });
          }
          
          return results;
        }
      } catch (error) {
        console.error("Error fetching from Indeed:", error);
        return [];
      }
    }
    
    // Helper to strip HTML tags with improved handling
    function stripTags(html: string): string {
      if (!html) return '';
      // Replace HTML entities
      return html
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Function to get real results via API if available
    async function fetchFromJobApi(searchQuery: string, provider: string): Promise<SearchResult[]> {
      try {
        // This is a placeholder for using an actual job API
        // In a real implementation, you would integrate with services like:
        // - Reed API
        // - Adzuna API
        // - GitHub Jobs API
        // - etc.
        
        // For now, return an empty array, forcing fallback to scraping approaches
        return [];
      } catch (error) {
        console.error("Error fetching from Job API:", error);
        return [];
      }
    }

    // Determine which providers to fetch from
    const shouldFetchGoogle = !provider || provider === 'google';
    const shouldFetchLinkedIn = !provider || provider === 'linkedin';
    const shouldFetchIndeed = !provider || provider === 'indeed';
    
    // First try to fetch from job APIs if available
    results = await fetchFromJobApi(searchTerm, provider || 'all');
    
    // If API didn't return results, try scraping
    if (results.length === 0) {
      console.log("No API results, trying web scraping");
      
      // Fetch from all requested providers
      const promises: Promise<SearchResult[]>[] = [];
      
      if (shouldFetchGoogle) promises.push(fetchGoogleJobs(searchTerm));
      if (shouldFetchLinkedIn) promises.push(fetchLinkedInJobs(searchTerm));
      if (shouldFetchIndeed) promises.push(fetchIndeedJobs(searchTerm));
      
      // Wait for all requests to complete
      const resultsArrays = await Promise.all(promises);
      
      // Combine results
      results = resultsArrays.flat();
    }
    
    // Enhance results with additional metadata
    const enhancedResults = results.map(result => ({
      ...result,
      // Add a unique identifier to help with deduplication
      id: `${result.source}-${result.title}-${result.company}`.replace(/\s+/g, '-').toLowerCase(),
      // Add a timestamp for sorting
      timestamp: new Date().toISOString(),
      // Flag whether this is a real or fallback result
      isReal: !result.source.includes('Alternative') && result.source !== 'Fallback',
    }));
    
    // Deduplicate results
    const seenIds = new Set();
    const uniqueResults = enhancedResults.filter(r => {
      const duplicate = seenIds.has(r.id);
      seenIds.add(r.id);
      return !duplicate;
    });
    
    // Fallback if no results were found or too few results
    if (uniqueResults.length < 2) {
      console.log("Not enough search results found. Using fallback data.");
      // Generate high-quality fallback results based on search term
      const fallbackResults = [
        {
          id: `fallback-1-${searchTerm}`,
          title: `${searchTerm} Engineer`,
          company: "Tech Company Inc.",
          location: "Remote",
          date: "Today",
          url: "https://example.com/job1",
          snippet: `We are looking for a ${searchTerm} engineer with strong programming skills. This position requires experience with modern web technologies.`,
          source: "Fallback",
          timestamp: new Date().toISOString(),
          isReal: false
        },
        {
          id: `fallback-2-${searchTerm}`,
          title: `Senior ${searchTerm} Developer`,
          company: "Innovation Labs",
          location: "New York, NY",
          date: "2 days ago",
          url: "https://example.com/job2",
          snippet: `Senior ${searchTerm} Developer needed for a fast-paced team. Must have 5+ years of experience.`,
          source: "Fallback",
          timestamp: new Date().toISOString(),
          isReal: false
        },
        {
          id: `fallback-3-${searchTerm}`,
          title: `${searchTerm} Specialist`,
          company: "Global Solutions",
          location: "San Francisco, CA",
          date: "1 week ago",
          url: "https://example.com/job3",
          snippet: `Join our team as a ${searchTerm} Specialist. Competitive salary and benefits package.`,
          source: "Fallback",
          timestamp: new Date().toISOString(),
          isReal: false
        }
      ];
      
      // Add fallback results if there aren't enough real ones
      uniqueResults.push(...fallbackResults.slice(0, Math.max(0, 3 - uniqueResults.length)));
    }
    
    // Log results count for debugging
    console.log(`Returning ${uniqueResults.length} total results (${uniqueResults.filter(r => r.isReal).length} real, ${uniqueResults.filter(r => !r.isReal).length} fallback)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: uniqueResults,
        meta: {
          query: searchTerm,
          provider: provider || 'all',
          timestamp: new Date().toISOString(),
          realResultsCount: uniqueResults.filter(r => r.isReal).length,
          fallbackResultsCount: uniqueResults.filter(r => !r.isReal).length
        }
      }),
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
