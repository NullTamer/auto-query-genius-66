
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts"; // Required for some browser APIs

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

// Utility to add artificial delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    
    // Array of rotating user agents for bypassing scraping detection
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
      'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    ];
    
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // Enhanced headers to look more like a real browser
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
      'DNT': '1'
    };

    let results: SearchResult[] = [];
    
    // Enhanced Google Jobs scraper with retry mechanism
    async function fetchGoogleJobs(searchQuery: string): Promise<SearchResult[]> {
      // Constants for retry mechanism
      const MAX_RETRIES = 3;
      const BASE_DELAY = 2000;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await delay(attempt > 0 ? BASE_DELAY * (attempt + 1) : BASE_DELAY);
          
          const encodedQuery = encodeURIComponent(searchQuery + " jobs");
          // Use Google's Jobs specific URL
          const url = `https://www.google.com/search?q=${encodedQuery}&ibp=htl;jobs`;
          
          console.log(`Scraping from Google Jobs (attempt ${attempt + 1}): ${url}`);
          const response = await fetch(url, { headers });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch from Google: ${response.status}`);
          }
          
          const html = await response.text();
          console.log(`Received HTML from Google (length: ${html.length})`);
          
          // Check if we've been rate limited or blocked
          if (html.includes("unusual traffic") || html.includes("CAPTCHA")) {
            console.warn("Google may have detected scraping - received CAPTCHA or unusual traffic warning");
            continue; // Try again with a different user agent
          }
          
          const results: SearchResult[] = [];
          
          // Various extraction patterns to handle Google Jobs layout
          const extractionPatterns = [
            // Pattern 1: Modern Google Jobs layout
            {
              cardRegex: /<div[^>]*class="[^"]*BjJfJf[^"]*"[^>]*>(.*?)<\/div><\/div><\/div><\/div>/gs,
              titleRegex: /<h2[^>]*class="[^"]*BjJfJf[^"]*"[^>]*>(.*?)<\/h2>/g,
              companyRegex: /<div[^>]*class="[^"]*vNEEBe[^"]*"[^>]*>(.*?)<\/div>/g,
              locationRegex: /<div[^>]*class="[^"]*Qk80Jf[^"]*"[^>]*>(.*?)<\/div>/g,
              detailsRegex: /<div[^>]*class="[^"]*KKh3md[^"]*"[^>]*>(.*?)<\/div>/g,
              snippetRegex: /<span[^>]*class="[^"]*HBvzbc[^"]*"[^>]*>(.*?)<\/span>/g
            },
            // Pattern 2: Alternative Google Jobs layout
            {
              cardRegex: /<div[^>]*class="[^"]*pE8vnd[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs,
              titleRegex: /<div[^>]*class="[^"]*BvQan[^"]*"[^>]*>(.*?)<\/div>/g,
              companyRegex: /<div[^>]*class="[^"]*nJlQNd[^"]*"[^>]*>(.*?)<\/div>/g,
              locationRegex: /<div[^>]*class="[^"]*oNwCmf[^"]*"[^>]*>(.*?)<\/div>/g,
              detailsRegex: /<div[^>]*class="[^"]*I2Cbhb[^"]*"[^>]*>(.*?)<\/div>/g,
              snippetRegex: /<div[^>]*class="[^"]*IiQJ2c[^"]*"[^>]*>(.*?)<\/div>/g
            },
            // Pattern 3: Classic Google Jobs layout
            {
              cardRegex: /<li[^>]*class="[^"]*job-item[^"]*"[^>]*>(.*?)<\/li>/gs,
              titleRegex: /<a[^>]*class="[^"]*jobtitle[^"]*"[^>]*>(.*?)<\/a>/g,
              companyRegex: /<span[^>]*class="[^"]*company[^"]*"[^>]*>(.*?)<\/span>/g,
              locationRegex: /<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/g,
              detailsRegex: /<span[^>]*class="[^"]*salary[^"]*"[^>]*>(.*?)<\/span>/g,
              snippetRegex: /<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>(.*?)<\/div>/g
            }
          ];
          
          // Try each pattern until we get results
          for (const pattern of extractionPatterns) {
            const jobCards = [...html.matchAll(pattern.cardRegex)];
            
            if (jobCards.length > 0) {
              console.log(`Found ${jobCards.length} potential job cards using pattern`);
              
              // Extract all matches
              const titles = [...html.matchAll(pattern.titleRegex)].map(match => stripTags(match[1]));
              const companies = [...html.matchAll(pattern.companyRegex)].map(match => stripTags(match[1]));
              const locations = [...html.matchAll(pattern.locationRegex)].map(match => stripTags(match[1]));
              const details = [...html.matchAll(pattern.detailsRegex)].map(match => stripTags(match[1]));
              const snippets = [...html.matchAll(pattern.snippetRegex)].map(match => stripTags(match[1]));
              
              console.log(`Extracted: ${titles.length} titles, ${companies.length} companies, ${locations.length} locations, ${snippets.length} snippets`);
              
              if (titles.length > 0 && companies.length > 0) {
                // Create job listings from the extracted data
                const limit = Math.min(titles.length, companies.length, 10);
                
                for (let i = 0; i < limit; i++) {
                  // Extract salary information from details if available
                  let salary = undefined;
                  if (details[i] && details[i].includes('$')) {
                    salary = details[i];
                  }
                  
                  // Create the job listing
                  results.push({
                    title: titles[i] || `Job ${i+1}`,
                    company: companies[i] || "Unknown Company",
                    location: locations[i] || "Remote",
                    date: "Recent",
                    url: `https://www.google.com/search?q=${encodedQuery}`,
                    snippet: snippets[i] || `Job opportunity at ${companies[i] || "a company"}`,
                    source: "Google Jobs",
                    salary
                  });
                }
                
                // If we found results, return them
                if (results.length > 0) {
                  return results;
                }
              }
            }
          }
          
          // If we couldn't extract using any pattern but found HTML, look for any job-related data
          if (html.length > 1000) {
            // Last resort direct extraction
            const jobTitles = html.match(/<h2[^>]*>(.*?)<\/h2>/g) || [];
            const companyNames = html.match(/<span[^>]*company[^>]*>(.*?)<\/span>/g) || [];
            
            if (jobTitles.length > 0) {
              console.log(`Found ${jobTitles.length} potential job titles with direct extraction`);
              
              for (let i = 0; i < Math.min(jobTitles.length, 5); i++) {
                results.push({
                  title: stripTags(jobTitles[i]),
                  company: companyNames[i] ? stripTags(companyNames[i]) : "Unknown Company",
                  location: "Various Locations",
                  date: "Recent",
                  url: `https://www.google.com/search?q=${encodedQuery}`,
                  snippet: `Job opportunity related to ${searchQuery}`,
                  source: "Google Jobs"
                });
              }
              
              if (results.length > 0) {
                return results;
              }
            }
          }
          
          console.log("No job listings found in Google Jobs response");
          if (attempt === MAX_RETRIES - 1) {
            console.log("All Google scraping attempts failed");
          }
        } catch (error) {
          console.error(`Error fetching from Google Jobs (attempt ${attempt + 1}):`, error);
          if (attempt === MAX_RETRIES - 1) {
            console.error("All Google scraping attempts failed");
          }
        }
      }
      
      return [];
    }
    
    // Enhanced LinkedIn Jobs scraper
    async function fetchLinkedInJobs(searchQuery: string): Promise<SearchResult[]> {
      const MAX_RETRIES = 2;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await delay(1000 * (attempt + 1));
          
          const encodedQuery = encodeURIComponent(searchQuery);
          const url = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;
          
          console.log(`Scraping from LinkedIn (attempt ${attempt + 1}): ${url}`);
          const response = await fetch(url, { headers });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch from LinkedIn: ${response.status}`);
          }
          
          const html = await response.text();
          console.log(`Received HTML from LinkedIn (length: ${html.length})`);
          
          const results: SearchResult[] = [];
          
          // Various extraction patterns for LinkedIn
          const extractionPatterns = [
            // Pattern 1: Modern LinkedIn job cards
            {
              cardRegex: /<div[^>]*class="[^"]*base-card[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs,
              titleRegex: /<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>(.*?)<\/h3>/s,
              companyRegex: /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>(.*?)<\/h4>/s,
              locationRegex: /<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>(.*?)<\/span>/s,
              dateRegex: /<time[^>]*datetime[^>]*>(.*?)<\/time>/s,
              linkRegex: /href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/,
              snippetRegex: /<p[^>]*class="[^"]*job-search-card__snippet[^"]*"[^>]*>(.*?)<\/p>/s
            },
            // Pattern 2: Classic LinkedIn job listing
            {
              cardRegex: /<li[^>]*class="[^"]*jobs-search-results__list-item[^"]*"[^>]*>(.*?)<\/li>/gs,
              titleRegex: /<a[^>]*class="[^"]*job-title[^"]*"[^>]*>(.*?)<\/a>/s,
              companyRegex: /<a[^>]*class="[^"]*company-name[^"]*"[^>]*>(.*?)<\/a>/s,
              locationRegex: /<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/s,
              dateRegex: /<span[^>]*class="[^"]*date[^"]*"[^>]*>(.*?)<\/span>/s,
              linkRegex: /href="([^"]+)"/,
              snippetRegex: /<p[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/p>/s
            }
          ];
          
          // Try each pattern until we get results
          for (const pattern of extractionPatterns) {
            const jobCards = [...html.matchAll(pattern.cardRegex)];
            
            if (jobCards.length > 0) {
              console.log(`Found ${jobCards.length} LinkedIn job cards using pattern`);
              
              // Extract details from each card
              for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
                const card = jobCards[i][1];
                
                const titleMatch = card.match(pattern.titleRegex);
                const companyMatch = card.match(pattern.companyRegex);
                const locationMatch = card.match(pattern.locationRegex);
                const dateMatch = card.match(pattern.dateRegex);
                const linkMatch = card.match(pattern.linkRegex);
                const snippetMatch = card.match(pattern.snippetRegex);
                
                results.push({
                  title: titleMatch ? stripTags(titleMatch[1]) : `LinkedIn Job ${i+1}`,
                  company: companyMatch ? stripTags(companyMatch[1]) : "Unknown Company",
                  location: locationMatch ? stripTags(locationMatch[1]) : "Remote",
                  date: dateMatch ? stripTags(dateMatch[1]) : "Recent",
                  url: linkMatch ? linkMatch[1] : url,
                  snippet: snippetMatch ? stripTags(snippetMatch[1]) : `Job opportunity at ${companyMatch ? stripTags(companyMatch[1]) : "a company"}`,
                  source: "LinkedIn"
                });
              }
              
              // If we found results, return them
              if (results.length > 0) {
                return results;
              }
            }
          }
          
          // Last resort: look for any job-related content
          if (html.length > 1000) {
            const jobTitles = html.match(/<h3[^>]*>(.*?)<\/h3>/g) || [];
            const companyNames = html.match(/<h4[^>]*>(.*?)<\/h4>/g) || [];
            
            if (jobTitles.length > 0) {
              console.log(`Found ${jobTitles.length} potential job titles with direct extraction`);
              
              for (let i = 0; i < Math.min(jobTitles.length, 5); i++) {
                results.push({
                  title: stripTags(jobTitles[i]),
                  company: companyNames[i] ? stripTags(companyNames[i]) : "Unknown Company",
                  location: "Various Locations",
                  date: "Recent",
                  url: url,
                  snippet: `Job opportunity related to ${searchQuery}`,
                  source: "LinkedIn"
                });
              }
              
              if (results.length > 0) {
                return results;
              }
            }
          }
          
          console.log("No job listings found in LinkedIn response");
        } catch (error) {
          console.error(`Error fetching from LinkedIn (attempt ${attempt + 1}):`, error);
        }
      }
      
      return [];
    }
    
    // Enhanced Indeed Jobs scraper
    async function fetchIndeedJobs(searchQuery: string): Promise<SearchResult[]> {
      const MAX_RETRIES = 2;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await delay(1500 * (attempt + 1));
          
          const encodedQuery = encodeURIComponent(searchQuery);
          const url = `https://www.indeed.com/jobs?q=${encodedQuery}`;
          
          console.log(`Scraping from Indeed (attempt ${attempt + 1}): ${url}`);
          const response = await fetch(url, { headers });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch from Indeed: ${response.status}`);
          }
          
          const html = await response.text();
          console.log(`Received HTML from Indeed (length: ${html.length})`);
          
          const results: SearchResult[] = [];
          
          // Various extraction patterns for Indeed
          const extractionPatterns = [
            // Pattern 1: Modern Indeed job cards
            {
              cardRegex: /<div[^>]*class="[^"]*job_seen_beacon[^"]*"[^>]*>(.*?)<\/div><\/div><\/div><\/div>/gs,
              titleRegex: /<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>(.*?)<\/h2>/s,
              companyRegex: /<span[^>]*class="[^"]*companyName[^"]*"[^>]*>(.*?)<\/span>/s,
              locationRegex: /<div[^>]*class="[^"]*companyLocation[^"]*"[^>]*>(.*?)<\/div>/s,
              salaryRegex: /<span[^>]*class="[^"]*salary[^"]*"[^>]*>(.*?)<\/span>/s,
              snippetRegex: /<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>(.*?)<\/div>/s
            },
            // Pattern 2: Classic Indeed job listing
            {
              cardRegex: /<div[^>]*class="[^"]*jobsearch-SerpJobCard[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs,
              titleRegex: /<a[^>]*class="[^"]*jobtitle[^"]*"[^>]*>(.*?)<\/a>/s,
              companyRegex: /<span[^>]*class="[^"]*company[^"]*"[^>]*>(.*?)<\/span>/s,
              locationRegex: /<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/s,
              salaryRegex: /<span[^>]*class="[^"]*salaryText[^"]*"[^>]*>(.*?)<\/span>/s,
              snippetRegex: /<div[^>]*class="[^"]*summary[^"]*"[^>]*>(.*?)<\/div>/s
            },
            // Pattern 3: Alternative Indeed cards
            {
              cardRegex: /<div[^>]*class="[^"]*tapItem[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs,
              titleRegex: /<span[^>]*id="jobTitle[^"]*"[^>]*>(.*?)<\/span>/s,
              companyRegex: /<span[^>]*class="[^"]*companyName[^"]*"[^>]*>(.*?)<\/span>/s,
              locationRegex: /<div[^>]*class="[^"]*companyLocation[^"]*"[^>]*>(.*?)<\/div>/s,
              salaryRegex: /<span[^>]*class="[^"]*salary[^"]*"[^>]*>(.*?)<\/span>/s,
              snippetRegex: /<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>(.*?)<\/div>/s
            }
          ];
          
          // Try each pattern until we get results
          for (const pattern of extractionPatterns) {
            const jobCards = [...html.matchAll(pattern.cardRegex)];
            
            if (jobCards.length > 0) {
              console.log(`Found ${jobCards.length} Indeed job cards using pattern`);
              
              // Extract details from each card
              for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
                const card = jobCards[i][1];
                
                const titleMatch = card.match(pattern.titleRegex);
                const companyMatch = card.match(pattern.companyRegex);
                const locationMatch = card.match(pattern.locationRegex);
                const salaryMatch = card.match(pattern.salaryRegex);
                const snippetMatch = card.match(pattern.snippetRegex);
                
                results.push({
                  title: titleMatch ? stripTags(titleMatch[1]) : `Indeed Job ${i+1}`,
                  company: companyMatch ? stripTags(companyMatch[1]) : "Unknown Company",
                  location: locationMatch ? stripTags(locationMatch[1]) : "Remote",
                  date: "Recent",
                  url: url,
                  snippet: snippetMatch ? stripTags(snippetMatch[1]) : `Job opportunity at ${companyMatch ? stripTags(companyMatch[1]) : "a company"}`,
                  source: "Indeed",
                  salary: salaryMatch ? stripTags(salaryMatch[1]) : undefined
                });
              }
              
              // If we found results, return them
              if (results.length > 0) {
                return results;
              }
            }
          }
          
          // Last resort direct extraction
          if (html.length > 1000) {
            // Look for job listings in tabular format
            const tableJobRegex = /<tr[^>]*class="[^"]*result[^"]*"[^>]*>(.*?)<\/tr>/gs;
            const tableJobs = [...html.matchAll(tableJobRegex)];
            
            if (tableJobs.length > 0) {
              console.log(`Found ${tableJobs.length} job rows with alternative method`);
              
              for (let i = 0; i < Math.min(tableJobs.length, 10); i++) {
                const row = tableJobs[i][1];
                
                const titleMatch = row.match(/<a[^>]*class="[^"]*jobtitle[^"]*"[^>]*>(.*?)<\/a>/s);
                const companyMatch = row.match(/<span[^>]*class="[^"]*company[^"]*"[^>]*>(.*?)<\/span>/s);
                const locationMatch = row.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/s);
                
                results.push({
                  title: titleMatch ? stripTags(titleMatch[1]) : `Indeed Job ${i+1}`,
                  company: companyMatch ? stripTags(companyMatch[1]) : "Unknown Company",
                  location: locationMatch ? stripTags(locationMatch[1]) : "Remote",
                  date: "Recent",
                  url: url,
                  snippet: `Job opportunity at ${companyMatch ? stripTags(companyMatch[1]) : "a company"}`,
                  source: "Indeed"
                });
              }
              
              if (results.length > 0) {
                return results;
              }
            }
          }
          
          console.log("No job listings found in Indeed response");
        } catch (error) {
          console.error(`Error fetching from Indeed (attempt ${attempt + 1}):`, error);
        }
      }
      
      return [];
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
    
    // Wait for all requests to complete with a timeout
    const timeout = (ms: number) => new Promise(resolve => setTimeout(() => resolve([]), ms));
    const resultsArrays = await Promise.race([
      Promise.all(promises),
      timeout(25000)  // 25 second timeout
    ]) as SearchResult[][];
    
    // Combine results from all providers
    for (const array of resultsArrays) {
      results = [...results, ...array];
    }
    
    console.log(`Found ${results.length} total results from all providers`);
    
    // Generate fallback results only if no real results were found
    if (results.length === 0) {
      console.log("No search results found. Generating minimal fallback data with clear indication.");
      
      // Create minimal fallback job listings
      const terms = searchTerm.split(" ");
      const roles = ["Developer", "Engineer", "Specialist", "Manager", "Consultant"];
      
      for (let i = 0; i < 3; i++) {
        results.push({
          title: `${terms[0]} ${roles[i % roles.length]}`,
          company: "No results found",
          location: "Try different search terms",
          date: "N/A",
          url: `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`,
          snippet: `No real job listings found for "${searchTerm}". Try modifying your search terms or checking external job boards directly.`,
          source: "Fallback"
        });
      }
    }
    
    // Add unique identifiers to help with display
    const enhancedResults = results.map((result, index) => ({
      ...result,
      id: `${result.source}-${index}`
    }));
    
    // Log results breakdown
    console.log(`Returning ${enhancedResults.length} job listings (${enhancedResults.filter(r => r.source !== 'Fallback').length} real, ${enhancedResults.filter(r => r.source === 'Fallback').length} fallback)`);

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
