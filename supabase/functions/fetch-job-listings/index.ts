
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
    
    // More advanced headers for more reliable scraping with rotating user agents
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
      'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
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
      'DNT': '1'
    };

    let results: SearchResult[] = [];
    
    // Enhanced function to scrape Google Jobs with better selectors and patterns
    async function fetchGoogleJobs(searchQuery: string): Promise<SearchResult[]> {
      try {
        const encodedQuery = encodeURIComponent(searchQuery + " jobs");
        // Direct Google Jobs URL
        const url = `https://www.google.com/search?q=${encodedQuery}&ibp=htl;jobs`;
        
        console.log(`Scraping from Google Jobs: ${url}`);
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch from Google: ${response.status}`);
        }
        
        const html = await response.text();
        console.log(`Received HTML from Google (length: ${html.length})`);
        
        // Check if we've been rate limited or blocked
        if (html.includes("unusual traffic") || html.includes("CAPTCHA")) {
          console.warn("Google may have detected scraping - received CAPTCHA or unusual traffic warning");
        }
        
        const results: SearchResult[] = [];
        
        // Better extraction patterns for Google Jobs
        // Extract job cards from the HTML
        const jobCardRegex = /<div[^>]*class="[^"]*BjJfJf[^"]*"[^>]*>(.*?)<\/div><\/div><\/div><\/div>/gs;
        const jobCards = [...html.matchAll(jobCardRegex)];
        
        console.log(`Found ${jobCards.length} potential job cards in Google results`);
        
        // If we found job cards, extract details from each
        if (jobCards.length > 0) {
          // Extract using modern Google Jobs selectors
          const titleRegex = /<h2[^>]*class="[^"]*BjJfJf[^"]*"[^>]*>(.*?)<\/h2>/g;
          const companyRegex = /<div[^>]*class="[^"]*vNEEBe[^"]*"[^>]*>(.*?)<\/div>/g;
          const locationRegex = /<div[^>]*class="[^"]*Qk80Jf[^"]*"[^>]*>(.*?)<\/div>/g;
          const detailsRegex = /<div[^>]*class="[^"]*KKh3md[^"]*"[^>]*>(.*?)<\/div>/g;
          const snippetRegex = /<span[^>]*class="[^"]*HBvzbc[^"]*"[^>]*>(.*?)<\/span>/g;
          
          // Extract all matches
          const titles = [...html.matchAll(titleRegex)].map(match => stripTags(match[1]));
          const companies = [...html.matchAll(companyRegex)].map(match => stripTags(match[1]));
          const locations = [...html.matchAll(locationRegex)].map(match => stripTags(match[1]));
          const details = [...html.matchAll(detailsRegex)].map(match => stripTags(match[1]));
          const snippets = [...html.matchAll(snippetRegex)].map(match => stripTags(match[1]));
          
          console.log(`Extracted: ${titles.length} titles, ${companies.length} companies, ${locations.length} locations, ${snippets.length} snippets`);
          
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
        }
        
        // If we couldn't extract using the primary method, try an alternative approach
        if (results.length === 0) {
          console.log("Using alternative Google Jobs extraction method");
          
          // Alternative regex patterns for different Google Jobs layouts
          const altCardRegex = /<li[^>]*class="[^"]*job-item[^"]*"[^>]*>(.*?)<\/li>/gs;
          const altCards = [...html.matchAll(altCardRegex)];
          
          if (altCards.length > 0) {
            console.log(`Found ${altCards.length} job cards with alternative method`);
            
            for (let i = 0; i < Math.min(altCards.length, 10); i++) {
              const cardHtml = altCards[i][1];
              
              // Extract job details from the card
              const titleMatch = cardHtml.match(/<a[^>]*class="[^"]*job-title[^"]*"[^>]*>(.*?)<\/a>/s);
              const companyMatch = cardHtml.match(/<span[^>]*class="[^"]*company-name[^"]*"[^>]*>(.*?)<\/span>/s);
              const locationMatch = cardHtml.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/s);
              const linkMatch = cardHtml.match(/href="([^"]+)"/);
              const snippetMatch = cardHtml.match(/<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>(.*?)<\/div>/s);
              
              results.push({
                title: titleMatch ? stripTags(titleMatch[1]) : `Google Job ${i+1}`,
                company: companyMatch ? stripTags(companyMatch[1]) : "Unknown Company",
                location: locationMatch ? stripTags(locationMatch[1]) : "Remote",
                date: "Recent",
                url: linkMatch ? linkMatch[1] : `https://www.google.com/search?q=${encodedQuery}`,
                snippet: snippetMatch ? stripTags(snippetMatch[1]) : "Job opportunity",
                source: "Google Jobs"
              });
            }
          }
        }
        
        return results;
      } catch (error) {
        console.error("Error fetching from Google Jobs:", error);
        return [];
      }
    }
    
    // Enhanced function to scrape LinkedIn Jobs
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
        
        // Extract job cards with a more reliable pattern
        const jobCardRegex = /<div[^>]*class="[^"]*base-card[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs;
        const jobCards = [...html.matchAll(jobCardRegex)];
        
        console.log(`Found ${jobCards.length} LinkedIn job cards`);
        
        // If we found job cards, extract details from each
        if (jobCards.length > 0) {
          for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
            const card = jobCards[i][1];
            
            // Extract job details with more specific regexes
            const titleMatch = card.match(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>(.*?)<\/h3>/s);
            const companyMatch = card.match(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>(.*?)<\/h4>/s);
            const locationMatch = card.match(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>(.*?)<\/span>/s);
            const dateMatch = card.match(/<time[^>]*datetime[^>]*>(.*?)<\/time>/s);
            const linkMatch = card.match(/href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/);
            
            // Extract snippet if available
            let snippet = "";
            const snippetMatch = card.match(/<p[^>]*class="[^"]*job-search-card__snippet[^"]*"[^>]*>(.*?)<\/p>/s);
            if (snippetMatch) {
              snippet = stripTags(snippetMatch[1]);
            }
            
            results.push({
              title: titleMatch ? stripTags(titleMatch[1]) : `LinkedIn Job ${i+1}`,
              company: companyMatch ? stripTags(companyMatch[1]) : "Unknown Company",
              location: locationMatch ? stripTags(locationMatch[1]) : "Remote",
              date: dateMatch ? stripTags(dateMatch[1]) : "Recent",
              url: linkMatch ? linkMatch[1] : url,
              snippet: snippet || `Job opportunity at ${companyMatch ? stripTags(companyMatch[1]) : "a company"}`,
              source: "LinkedIn"
            });
          }
        } 
        // Try a different extraction method if the first one failed
        else {
          console.log("Using alternative LinkedIn extraction method");
          
          // Alternative extraction patterns
          const altCardRegex = /<li[^>]*class="[^"]*jobs-search-results__list-item[^"]*"[^>]*>(.*?)<\/li>/gs;
          const altCards = [...html.matchAll(altCardRegex)];
          
          if (altCards.length > 0) {
            console.log(`Found ${altCards.length} job cards with alternative method`);
            
            for (let i = 0; i < Math.min(altCards.length, 10); i++) {
              const card = altCards[i][1];
              
              const titleMatch = card.match(/<a[^>]*class="[^"]*job-title[^"]*"[^>]*>(.*?)<\/a>/s);
              const companyMatch = card.match(/<a[^>]*class="[^"]*company-name[^"]*"[^>]*>(.*?)<\/a>/s);
              const locationMatch = card.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/s);
              const linkMatch = card.match(/href="([^"]+)"/);
              
              results.push({
                title: titleMatch ? stripTags(titleMatch[1]) : `LinkedIn Job ${i+1}`,
                company: companyMatch ? stripTags(companyMatch[1]) : "Unknown Company", 
                location: locationMatch ? stripTags(locationMatch[1]) : "Remote",
                date: "Recent",
                url: linkMatch ? linkMatch[1] : url,
                snippet: `Job opportunity at ${companyMatch ? stripTags(companyMatch[1]) : "a company"}`,
                source: "LinkedIn"
              });
            }
          }
        }
        
        return results;
      } catch (error) {
        console.error("Error fetching from LinkedIn:", error);
        return [];
      }
    }
    
    // Enhanced function to scrape Indeed Jobs
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
        
        // Extract job cards with a more reliable pattern
        // Try to extract job cards in different formats Indeed might use
        const jobCardPatterns = [
          /<div[^>]*class="[^"]*job_seen_beacon[^"]*"[^>]*>(.*?)<\/div><\/div><\/div><\/div>/gs,
          /<div[^>]*class="[^"]*jobsearch-SerpJobCard[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs,
          /<div[^>]*class="[^"]*tapItem[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs
        ];
        
        let jobCards: RegExpMatchArray[] = [];
        
        // Try each pattern until we find job cards
        for (const pattern of jobCardPatterns) {
          jobCards = [...html.matchAll(pattern)];
          if (jobCards.length > 0) break;
        }
        
        console.log(`Found ${jobCards.length} Indeed job cards`);
        
        // If we found job cards, extract details from each
        if (jobCards.length > 0) {
          for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
            const card = jobCards[i][1];
            
            // Try different patterns for job details
            const titlePatterns = [
              /<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>(.*?)<\/h2>/s,
              /<a[^>]*class="[^"]*jobtitle[^"]*"[^>]*>(.*?)<\/a>/s,
              /<span[^>]*id="jobTitle[^"]*"[^>]*>(.*?)<\/span>/s
            ];
            
            const companyPatterns = [
              /<span[^>]*class="[^"]*companyName[^"]*"[^>]*>(.*?)<\/span>/s,
              /<span[^>]*class="[^"]*company[^"]*"[^>]*>(.*?)<\/span>/s,
              /<div[^>]*class="[^"]*company_location[^"]*"[^>]*>(.*?)<\/div>/s
            ];
            
            const locationPatterns = [
              /<div[^>]*class="[^"]*companyLocation[^"]*"[^>]*>(.*?)<\/div>/s,
              /<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/s,
              /<div[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/div>/s
            ];
            
            const snippetPatterns = [
              /<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>(.*?)<\/div>/s,
              /<div[^>]*class="[^"]*summary[^"]*"[^>]*>(.*?)<\/div>/s,
              /<span[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/span>/s
            ];
            
            // Try each pattern for each field
            let titleMatch = null;
            let companyMatch = null;
            let locationMatch = null;
            let snippetMatch = null;
            
            for (const pattern of titlePatterns) {
              titleMatch = card.match(pattern);
              if (titleMatch) break;
            }
            
            for (const pattern of companyPatterns) {
              companyMatch = card.match(pattern);
              if (companyMatch) break;
            }
            
            for (const pattern of locationPatterns) {
              locationMatch = card.match(pattern);
              if (locationMatch) break;
            }
            
            for (const pattern of snippetPatterns) {
              snippetMatch = card.match(pattern);
              if (snippetMatch) break;
            }
            
            // Extract job type if available
            let jobType = undefined;
            const jobTypeMatch = card.match(/<div[^>]*class="[^"]*attribute_snippet[^"]*"[^>]*>(.*?)<\/div>/s) ||
                                card.match(/<span[^>]*class="[^"]*jobType[^"]*"[^>]*>(.*?)<\/span>/s);
            if (jobTypeMatch) {
              jobType = stripTags(jobTypeMatch[1]);
            }
            
            // Extract salary if available
            let salary = undefined;
            const salaryMatch = card.match(/<span[^>]*class="[^"]*salary[^"]*"[^>]*>(.*?)<\/span>/s) || 
                                card.match(/\$[0-9,.]+\s*-\s*\$[0-9,.]+/);
            if (salaryMatch) {
              salary = stripTags(salaryMatch[0] || salaryMatch[1]);
            }
            
            results.push({
              title: titleMatch ? stripTags(titleMatch[1]) : `Indeed Job ${i+1}`,
              company: companyMatch ? stripTags(companyMatch[1]) : "Unknown Company",
              location: locationMatch ? stripTags(locationMatch[1]) : "Remote",
              date: "Recent",
              url: url,
              snippet: snippetMatch ? stripTags(snippetMatch[1]) : `Job opportunity at ${companyMatch ? stripTags(companyMatch[1]) : "a company"}`,
              source: "Indeed",
              jobType,
              salary
            });
          }
        } 
        // Try a different extraction method if the first one failed
        else {
          console.log("Using alternative Indeed extraction method");
          
          // Look for job listings in a tabular format
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
    
    // Wait for all requests to complete with a more generous timeout
    const timeout = (ms: number) => new Promise(resolve => setTimeout(() => resolve([]), ms));
    const resultsArrays = await Promise.race([
      Promise.all(promises),
      timeout(30000)  // 30 second timeout
    ]) as SearchResult[][];
    
    // Combine results
    for (const array of resultsArrays) {
      results = [...results, ...array];
    }
    
    console.log(`Found ${results.length} total results from all providers`);
    
    // If no real results were found, generate fallback results but with less emphasis
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
      id: `${result.source}-${index}`
    }));
    
    // Log results
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
