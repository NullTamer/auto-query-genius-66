
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
  salary?: string;
  jobType?: string;
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
    
    // Extended headers for more reliable scraping - with rotating User-Agent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
    ];
    
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    const headers = {
      'User-Agent': randomUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'sec-ch-ua': '"Google Chrome";v="123", "Chromium";v="123", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Referer': 'https://www.google.com/',
    };

    let results: SearchResult[] = [];
    
    // Improved function to actually scrape Google Jobs results
    async function fetchGoogleJobs(searchQuery: string): Promise<SearchResult[]> {
      try {
        const encodedQuery = encodeURIComponent(searchQuery + " jobs");
        const url = `https://www.google.com/search?q=${encodedQuery}&ibp=htl;jobs`;
        
        console.log(`Scraping from Google Jobs: ${url}`);
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from Google: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Received HTML from Google (length: ${html.length})`);
        
        const results: SearchResult[] = [];
        
        // Extract job titles
        const titleRegex = /<h2[^>]*class="[^"]*BjJfJf[^"]*"[^>]*>(.*?)<\/h2>/g;
        const titles = [...html.matchAll(titleRegex)].map(match => stripTags(match[1]));
        
        // Extract companies
        const companyRegex = /<div[^>]*class="[^"]*vNEEBe[^"]*"[^>]*>(.*?)<\/div>/g;
        const companies = [...html.matchAll(companyRegex)].map(match => stripTags(match[1]));
        
        // Extract locations
        const locationRegex = /<div[^>]*class="[^"]*Qk80Jf[^"]*"[^>]*>(.*?)<\/div>/g;
        const locations = [...html.matchAll(locationRegex)].map(match => stripTags(match[1]));
        
        // Extract snippets
        const snippetRegex = /<span[^>]*class="[^"]*HBvzbc[^"]*"[^>]*>(.*?)<\/span>/g;
        const snippets = [...html.matchAll(snippetRegex)].map(match => stripTags(match[1]));
        
        // Extract dates (might be within another element)
        const dateRegex = /<span[^>]*class="[^"]*LL4CDc[^"]*"[^>]*>(.*?)<\/span>/g;
        const dates = [...html.matchAll(dateRegex)].map(match => stripTags(match[1]));
        
        // Extract salary information
        const salaryRegex = /<span[^>]*class="[^"]*salary[^"]*"[^>]*>(.*?)<\/span>/g;
        const salaries = [...html.matchAll(salaryRegex)].map(match => stripTags(match[1]));
        
        // Log what we found
        console.log(`Found ${titles.length} job titles, ${companies.length} companies, ${locations.length} locations`);
        
        // Create job listings from the extracted data
        const count = Math.min(titles.length, 10); // Limit to 10 results
        
        for (let i = 0; i < count; i++) {
          results.push({
            title: titles[i] || `Job ${i+1}`,
            company: companies[i] || "Unknown Company",
            location: locations[i] || "Remote",
            date: dates[i] || "Recent",
            url: `https://www.google.com/search?q=${encodedQuery}`,
            snippet: snippets[i] || `Job opportunity at ${companies[i] || "a company"}`,
            source: "Google Jobs",
            salary: salaries[i] || undefined
          });
        }
        
        // If we didn't get enough results from the primary scraping method, try alternative approach
        if (results.length < 5) {
          console.log("Using alternative Google scraping method");
          
          // Try alternative approach - look for job cards
          const jobCardRegex = /<div class="jobs-card[^>]*>(.*?)<\/div><\/div><\/div>/gs;
          const jobCards = [...html.matchAll(jobCardRegex)];
          
          console.log(`Found ${jobCards.length} job cards with alternative method`);
          
          for (let i = 0; i < Math.min(jobCards.length, 10 - results.length); i++) {
            const cardHtml = jobCards[i][1];
            
            // Extract job details from the card
            const cardTitleMatch = cardHtml.match(/<h3[^>]*>(.*?)<\/h3>/s);
            const cardCompanyMatch = cardHtml.match(/<div class="company[^>]*>(.*?)<\/div>/s);
            const cardLocationMatch = cardHtml.match(/<div class="location[^>]*>(.*?)<\/div>/s);
            
            results.push({
              title: cardTitleMatch ? stripTags(cardTitleMatch[1]) : `Job ${results.length + 1}`,
              company: cardCompanyMatch ? stripTags(cardCompanyMatch[1]) : "Unknown Company",
              location: cardLocationMatch ? stripTags(cardLocationMatch[1]) : "Remote",
              date: "Recent",
              url: `https://www.google.com/search?q=${encodedQuery}`,
              snippet: `Job opportunity found on Google Jobs.`,
              source: "Google Jobs"
            });
          }
        }
        
        return results;
      } catch (error) {
        console.error("Error fetching from Google Jobs:", error);
        return [];
      }
    }
    
    // Improved function to actually scrape LinkedIn Jobs
    async function fetchLinkedInJobs(searchQuery: string): Promise<SearchResult[]> {
      try {
        const encodedQuery = encodeURIComponent(searchQuery);
        const url = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;
        
        console.log(`Scraping from LinkedIn: ${url}`);
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from LinkedIn: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Received HTML from LinkedIn (length: ${html.length})`);
        
        const results: SearchResult[] = [];
        
        // Extract job cards
        const jobCardRegex = /<div class="base-card[^>]*>(.*?)<\/div><\/div><\/div>/gs;
        const jobCards = [...html.matchAll(jobCardRegex)];
        
        console.log(`Found ${jobCards.length} LinkedIn job cards`);
        
        // If job cards found, extract details
        if (jobCards.length > 0) {
          for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
            const card = jobCards[i][1];
            
            // Extract job details
            const titleMatch = card.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>(.*?)<\/h3>/s);
            const companyMatch = card.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>(.*?)<\/h4>/s);
            const locationMatch = card.match(/<span class="job-search-card__location">(.*?)<\/span>/s);
            const linkMatch = card.match(/href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/);
            
            // Extract snippet if available
            let snippet = "";
            const snippetMatch = card.match(/<p class="base-search-card__metadata">(.*?)<\/p>/s);
            if (snippetMatch) {
              snippet = stripTags(snippetMatch[1]);
            }
            
            results.push({
              title: titleMatch ? stripTags(titleMatch[1]) : `LinkedIn Job ${i+1}`,
              company: companyMatch ? stripTags(companyMatch[1]) : "Unknown Company",
              location: locationMatch ? stripTags(locationMatch[1]) : "Remote",
              date: "Recent",
              url: linkMatch ? linkMatch[1] : url,
              snippet: snippet || `Job opportunity at ${companyMatch ? stripTags(companyMatch[1]) : "a company"}`,
              source: "LinkedIn"
            });
          }
        } 
        // Try alternative extraction method for LinkedIn
        else {
          console.log("Using alternative LinkedIn scraping method");
          
          // Alternative approach - try to find job titles and companies separately
          const titleRegex = /<h3[^>]*class="[^"]*job-card-title[^"]*"[^>]*>(.*?)<\/h3>/g;
          const titles = [...html.matchAll(titleRegex)].map(match => stripTags(match[1]));
          
          const companyRegex = /<a[^>]*class="[^"]*company-name[^"]*"[^>]*>(.*?)<\/a>/g;
          const companies = [...html.matchAll(companyRegex)].map(match => stripTags(match[1]));
          
          console.log(`Found ${titles.length} titles and ${companies.length} companies with alternative method`);
          
          for (let i = 0; i < Math.min(titles.length, companies.length, 10); i++) {
            results.push({
              title: titles[i],
              company: companies[i],
              location: "Remote",
              date: "Recent",
              url: url,
              snippet: `${titles[i]} position at ${companies[i]}`,
              source: "LinkedIn"
            });
          }
        }
        
        return results;
      } catch (error) {
        console.error("Error fetching from LinkedIn:", error);
        return [];
      }
    }
    
    // Improved function to actually scrape Indeed Jobs
    async function fetchIndeedJobs(searchQuery: string): Promise<SearchResult[]> {
      try {
        const encodedQuery = encodeURIComponent(searchQuery);
        const url = `https://www.indeed.com/jobs?q=${encodedQuery}`;
        
        console.log(`Scraping from Indeed: ${url}`);
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from Indeed: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Received HTML from Indeed (length: ${html.length})`);
        
        const results: SearchResult[] = [];
        
        // Extract job cards
        const jobCardRegex = /<div class="job_seen_beacon">(.*?)<\/div><\/div><\/div><\/div>/gs;
        const jobCards = [...html.matchAll(jobCardRegex)];
        
        console.log(`Found ${jobCards.length} Indeed job cards`);
        
        // If job cards found, extract details
        if (jobCards.length > 0) {
          for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
            const card = jobCards[i][1];
            
            // Extract job details
            const titleMatch = card.match(/<h2[^>]*class="jobTitle[^"]*"[^>]*>(.*?)<\/h2>/s);
            const companyMatch = card.match(/<span class="companyName">(.*?)<\/span>/s);
            const locationMatch = card.match(/<div class="companyLocation">(.*?)<\/div>/s);
            
            // Extract snippet
            let snippet = "";
            const snippetMatch = card.match(/<div class="job-snippet">(.*?)<\/div>/s);
            if (snippetMatch) {
              snippet = stripTags(snippetMatch[1]);
            }
            
            // Extract job type if available
            let jobType = undefined;
            const jobTypeMatch = card.match(/<div class="attribute_snippet">(.*?)<\/div>/s);
            if (jobTypeMatch) {
              jobType = stripTags(jobTypeMatch[1]);
            }
            
            results.push({
              title: titleMatch ? stripTags(titleMatch[1]) : `Indeed Job ${i+1}`,
              company: companyMatch ? stripTags(companyMatch[1]) : "Unknown Company",
              location: locationMatch ? stripTags(locationMatch[1]) : "Remote",
              date: "Recent",
              url: url,
              snippet: snippet || `Job opportunity at ${companyMatch ? stripTags(companyMatch[1]) : "a company"}`,
              source: "Indeed",
              jobType
            });
          }
        } 
        // Try alternative extraction method for Indeed
        else {
          console.log("Using alternative Indeed scraping method");
          
          // Alternative approach - try to find job titles and companies separately
          const titleRegex = /<a[^>]*class="jobtitle[^"]*"[^>]*>(.*?)<\/a>/g;
          const titles = [...html.matchAll(titleRegex)].map(match => stripTags(match[1]));
          
          const companyRegex = /<span class="company">(.*?)<\/span>/g;
          const companies = [...html.matchAll(companyRegex)].map(match => stripTags(match[1]));
          
          console.log(`Found ${titles.length} titles and ${companies.length} companies with alternative method`);
          
          for (let i = 0; i < Math.min(titles.length, companies.length, 10); i++) {
            results.push({
              title: titles[i],
              company: companies[i],
              location: "Remote",
              date: "Recent",
              url: url,
              snippet: `${titles[i]} position at ${companies[i]}`,
              source: "Indeed"
            });
          }
        }
        
        return results;
      } catch (error) {
        console.error("Error fetching from Indeed:", error);
        return [];
      }
    }
    
    // Helper function to strip HTML tags
    function stripTags(html: string): string {
      if (!html) return '';
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

    // Determine which providers to fetch from
    const shouldFetchGoogle = !provider || provider === 'google';
    const shouldFetchLinkedIn = !provider || provider === 'linkedin';
    const shouldFetchIndeed = !provider || provider === 'indeed';
    
    // Fetch from all requested providers
    const promises: Promise<SearchResult[]>[] = [];
    
    if (shouldFetchGoogle) promises.push(fetchGoogleJobs(searchTerm));
    if (shouldFetchLinkedIn) promises.push(fetchLinkedInJobs(searchTerm));
    if (shouldFetchIndeed) promises.push(fetchIndeedJobs(searchTerm));
    
    // Wait for all requests to complete
    const resultsArrays = await Promise.all(promises);
    
    // Combine results
    for (const array of resultsArrays) {
      results = [...results, ...array];
    }
    
    // If no real results were found, generate fallback results
    if (results.length === 0) {
      console.log("No search results found. Using fallback data.");
      
      // Create job listings based on search query terms
      const terms = searchTerm.split(" ");
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
          url: `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`,
          snippet: `Join our team as a ${title} at ${company}. We're looking for talented professionals with experience in ${terms.join(", ")}.`,
          source: "Fallback"
        });
      }
    }
    
    // Add unique identifiers to help with display
    const enhancedResults = results.map((result, index) => ({
      ...result,
      id: `${result.source}-${index}`,
      isReal: result.source !== "Fallback"
    }));
    
    // Log results
    console.log(`Returning ${enhancedResults.length} job listings (${enhancedResults.filter(r => r.isReal).length} real, ${enhancedResults.filter(r => !r.isReal).length} fallback)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: enhancedResults 
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
