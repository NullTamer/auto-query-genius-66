
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
    
    // Array of rotating user agents to avoid being blocked
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

    // Create a scraper that uses Agno-like techniques
    class AgnoScraper {
      constructor(private provider: string, private headers: Record<string, string>) {}

      private async fetchContent(url: string, retryCount = 3): Promise<string> {
        for (let i = 0; i < retryCount; i++) {
          try {
            console.log(`Fetching content from ${url} (attempt ${i + 1}/${retryCount})`);
            const response = await fetch(url, { headers: this.headers });
            
            if (!response.ok) {
              throw new Error(`HTTP error: ${response.status}`);
            }
            
            const html = await response.text();
            console.log(`Received HTML length: ${html.length}`);
            
            if (html.includes("CAPTCHA") || html.includes("unusual traffic")) {
              console.log("CAPTCHA or traffic warning detected, retrying...");
              await delay(1000 * (i + 1));
              continue;
            }
            
            return html;
          } catch (error) {
            console.error(`Error fetching ${url} (attempt ${i + 1}/${retryCount}):`, error);
            if (i === retryCount - 1) throw error;
            await delay(1000 * (i + 1));
          }
        }
        throw new Error(`Failed to fetch ${url} after ${retryCount} attempts`);
      }

      private cleanText(text: string): string {
        return text
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
      }

      private extractWithRegex(html: string, regex: RegExp, groupIndex = 1): string[] {
        const matches = [...html.matchAll(regex)];
        return matches.map(match => this.cleanText(match[groupIndex]));
      }

      async scrapeJobs(searchTerm: string): Promise<SearchResult[]> {
        console.log(`Scraping jobs for "${searchTerm}" from ${this.provider}`);
        
        switch (this.provider) {
          case 'google':
            return this.scrapeGoogle(searchTerm);
          case 'linkedin':
            return this.scrapeLinkedIn(searchTerm);
          case 'indeed':
            return this.scrapeIndeed(searchTerm);
          default:
            throw new Error(`Unsupported provider: ${this.provider}`);
        }
      }

      private async scrapeGoogle(searchTerm: string): Promise<SearchResult[]> {
        const encodedQuery = encodeURIComponent(searchTerm + " jobs");
        const url = `https://www.google.com/search?q=${encodedQuery}&ibp=htl;jobs`;
        
        try {
          const html = await this.fetchContent(url);
          console.log('Successfully fetched Google Jobs HTML');
          
          // Multiple extraction patterns to handle Google's changing layout
          const extractionPatterns = [
            {
              jobCard: /<div[^>]*class="[^"]*BjJfJf[^"]*"[^>]*>(.*?)<\/div><\/div><\/div><\/div>/gs,
              title: /<h2[^>]*class="[^"]*BjJfJf[^"]*"[^>]*>(.*?)<\/h2>/g,
              company: /<div[^>]*class="[^"]*vNEEBe[^"]*"[^>]*>(.*?)<\/div>/g,
              location: /<div[^>]*class="[^"]*Qk80Jf[^"]*"[^>]*>(.*?)<\/div>/g,
              details: /<div[^>]*class="[^"]*KKh3md[^"]*"[^>]*>(.*?)<\/div>/g,
              snippet: /<span[^>]*class="[^"]*HBvzbc[^"]*"[^>]*>(.*?)<\/span>/g
            },
            {
              jobCard: /<div[^>]*class="[^"]*pE8vnd[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs,
              title: /<div[^>]*class="[^"]*BvQan[^"]*"[^>]*>(.*?)<\/div>/g,
              company: /<div[^>]*class="[^"]*nJlQNd[^"]*"[^>]*>(.*?)<\/div>/g,
              location: /<div[^>]*class="[^"]*oNwCmf[^"]*"[^>]*>(.*?)<\/div>/g,
              snippet: /<div[^>]*class="[^"]*IiQJ2c[^"]*"[^>]*>(.*?)<\/div>/g
            },
            {
              jobCard: /<div[^>]*class="[^"]*job-search-card[^"]*"[^>]*>(.*?)<\/div>/gs,
              title: /<a[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/a>/g,
              company: /<span[^>]*class="[^"]*company[^"]*"[^>]*>(.*?)<\/span>/g,
              location: /<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/g,
              snippet: /<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/g
            }
          ];
          
          for (const pattern of extractionPatterns) {
            const jobCards = [...html.matchAll(pattern.jobCard)];
            
            if (jobCards.length > 0) {
              console.log(`Found ${jobCards.length} job cards using pattern`);
              
              const titles = this.extractWithRegex(html, pattern.title);
              const companies = this.extractWithRegex(html, pattern.company);
              const locations = this.extractWithRegex(html, pattern.location);
              const snippets = pattern.snippet ? this.extractWithRegex(html, pattern.snippet) : [];
              
              console.log(`Extracted ${titles.length} titles, ${companies.length} companies, ${locations.length} locations`);
              
              if (titles.length > 0 || companies.length > 0) {
                const results: SearchResult[] = [];
                const limit = Math.min(Math.max(titles.length, companies.length), 10);
                
                for (let i = 0; i < limit; i++) {
                  results.push({
                    title: titles[i] || `Job ${i+1}`,
                    company: companies[i] || "Unknown Company",
                    location: locations[i] || "Remote",
                    date: "Recent",
                    url: `https://www.google.com/search?q=${encodedQuery}`,
                    snippet: snippets[i] || `Position at ${companies[i] || "a company"}`,
                    source: "Google Jobs",
                    salary: undefined
                  });
                }
                
                return results;
              }
            }
          }
          
          // Generic fallback extraction
          if (html.includes('job') || html.includes('career')) {
            const titleMatches = html.match(/<h3[^>]*>(.*?)<\/h3>/g) || [];
            const companyMatches = html.match(/<div[^>]*company[^>]*>(.*?)<\/div>/g) || [];
            
            if (titleMatches.length > 0) {
              console.log(`Found ${titleMatches.length} potential job titles with fallback extraction`);
              
              const results: SearchResult[] = [];
              for (let i = 0; i < Math.min(titleMatches.length, 5); i++) {
                results.push({
                  title: this.cleanText(titleMatches[i]),
                  company: companyMatches[i] ? this.cleanText(companyMatches[i]) : "Google Jobs Listing",
                  location: "Various Locations",
                  date: "Recent",
                  url: url,
                  snippet: `Job opportunity related to ${searchTerm}`,
                  source: "Google Jobs"
                });
              }
              
              return results;
            }
          }
          
          console.log("No Google job listings found with any extraction pattern");
          return [];
        } catch (error) {
          console.error("Error scraping Google:", error);
          return [];
        }
      }

      private async scrapeLinkedIn(searchTerm: string): Promise<SearchResult[]> {
        const encodedQuery = encodeURIComponent(searchTerm);
        const url = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;
        
        try {
          const html = await this.fetchContent(url);
          console.log('Successfully fetched LinkedIn Jobs HTML');
          
          // LinkedIn extraction patterns
          const extractionPatterns = [
            {
              jobCard: /<div[^>]*class="[^"]*base-card[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs,
              title: /<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>(.*?)<\/h3>/s,
              company: /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>(.*?)<\/h4>/s,
              location: /<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>(.*?)<\/span>/s,
              link: /href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/,
              snippet: /<p[^>]*class="[^"]*job-search-card__snippet[^"]*"[^>]*>(.*?)<\/p>/s
            },
            {
              jobCard: /<li[^>]*class="[^"]*jobs-search-results__list-item[^"]*"[^>]*>(.*?)<\/li>/gs,
              title: /<a[^>]*class="[^"]*job-title[^"]*"[^>]*>(.*?)<\/a>/s,
              company: /<a[^>]*class="[^"]*company-name[^"]*"[^>]*>(.*?)<\/a>/s,
              location: /<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/s,
              link: /href="([^"]+)"/,
              snippet: /<p[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/p>/s
            }
          ];
          
          for (const pattern of extractionPatterns) {
            const jobCards = [...html.matchAll(pattern.jobCard)];
            
            if (jobCards.length > 0) {
              console.log(`Found ${jobCards.length} LinkedIn job cards`);
              
              const results: SearchResult[] = [];
              for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
                const card = jobCards[i][1];
                
                const titleMatch = card.match(pattern.title);
                const companyMatch = card.match(pattern.company);
                const locationMatch = card.match(pattern.location);
                const linkMatch = card.match(pattern.link);
                const snippetMatch = card.match(pattern.snippet);
                
                results.push({
                  title: titleMatch ? this.cleanText(titleMatch[1]) : `LinkedIn Job ${i+1}`,
                  company: companyMatch ? this.cleanText(companyMatch[1]) : "Unknown Company",
                  location: locationMatch ? this.cleanText(locationMatch[1]) : "Various Locations",
                  date: "Recent",
                  url: linkMatch ? linkMatch[1] : url,
                  snippet: snippetMatch ? this.cleanText(snippetMatch[1]) : `Position at ${companyMatch ? this.cleanText(companyMatch[1]) : "a company"}`,
                  source: "LinkedIn"
                });
              }
              
              return results;
            }
          }
          
          // Fallback extraction for LinkedIn
          if (html.length > 1000) {
            const titleMatches = html.match(/<h3[^>]*>(.*?)<\/h3>/g) || [];
            const companyMatches = html.match(/<h4[^>]*>(.*?)<\/h4>/g) || [];
            
            if (titleMatches.length > 0) {
              console.log(`Found ${titleMatches.length} potential LinkedIn job titles with fallback extraction`);
              
              const results: SearchResult[] = [];
              for (let i = 0; i < Math.min(titleMatches.length, 5); i++) {
                results.push({
                  title: this.cleanText(titleMatches[i]),
                  company: companyMatches[i] ? this.cleanText(companyMatches[i]) : "LinkedIn Listing",
                  location: "Various Locations",
                  date: "Recent",
                  url: url,
                  snippet: `Job opportunity related to ${searchTerm}`,
                  source: "LinkedIn"
                });
              }
              
              return results;
            }
          }
          
          console.log("No LinkedIn job listings found with any extraction pattern");
          return [];
        } catch (error) {
          console.error("Error scraping LinkedIn:", error);
          return [];
        }
      }

      private async scrapeIndeed(searchTerm: string): Promise<SearchResult[]> {
        const encodedQuery = encodeURIComponent(searchTerm);
        const url = `https://www.indeed.com/jobs?q=${encodedQuery}`;
        
        try {
          const html = await this.fetchContent(url);
          console.log('Successfully fetched Indeed Jobs HTML');
          
          // Indeed extraction patterns
          const extractionPatterns = [
            {
              jobCard: /<div[^>]*class="[^"]*job_seen_beacon[^"]*"[^>]*>(.*?)<\/div><\/div><\/div><\/div>/gs,
              title: /<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>(.*?)<\/h2>/s,
              company: /<span[^>]*class="[^"]*companyName[^"]*"[^>]*>(.*?)<\/span>/s,
              location: /<div[^>]*class="[^"]*companyLocation[^"]*"[^>]*>(.*?)<\/div>/s,
              salary: /<span[^>]*class="[^"]*salary[^"]*"[^>]*>(.*?)<\/span>/s,
              snippet: /<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>(.*?)<\/div>/s
            },
            {
              jobCard: /<div[^>]*class="[^"]*jobsearch-SerpJobCard[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs,
              title: /<a[^>]*class="[^"]*jobtitle[^"]*"[^>]*>(.*?)<\/a>/s,
              company: /<span[^>]*class="[^"]*company[^"]*"[^>]*>(.*?)<\/span>/s,
              location: /<span[^>]*class="[^"]*location[^"]*"[^>]*>(.*?)<\/span>/s,
              salary: /<span[^>]*class="[^"]*salaryText[^"]*"[^>]*>(.*?)<\/span>/s,
              snippet: /<div[^>]*class="[^"]*summary[^"]*"[^>]*>(.*?)<\/div>/s
            },
            {
              jobCard: /<div[^>]*class="[^"]*tapItem[^"]*"[^>]*>(.*?)<\/div><\/div><\/div>/gs,
              title: /<span[^>]*id="jobTitle[^"]*"[^>]*>(.*?)<\/span>/s,
              company: /<span[^>]*class="[^"]*companyName[^"]*"[^>]*>(.*?)<\/span>/s,
              location: /<div[^>]*class="[^"]*companyLocation[^"]*"[^>]*>(.*?)<\/div>/s,
              salary: /<span[^>]*class="[^"]*salary[^"]*"[^>]*>(.*?)<\/span>/s,
              snippet: /<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>(.*?)<\/div>/s
            }
          ];
          
          for (const pattern of extractionPatterns) {
            const jobCards = [...html.matchAll(pattern.jobCard)];
            
            if (jobCards.length > 0) {
              console.log(`Found ${jobCards.length} Indeed job cards`);
              
              const results: SearchResult[] = [];
              for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
                const card = jobCards[i][1];
                
                const titleMatch = card.match(pattern.title);
                const companyMatch = card.match(pattern.company);
                const locationMatch = card.match(pattern.location);
                const salaryMatch = card.match(pattern.salary);
                const snippetMatch = card.match(pattern.snippet);
                
                results.push({
                  title: titleMatch ? this.cleanText(titleMatch[1]) : `Indeed Job ${i+1}`,
                  company: companyMatch ? this.cleanText(companyMatch[1]) : "Unknown Company",
                  location: locationMatch ? this.cleanText(locationMatch[1]) : "Various Locations",
                  date: "Recent",
                  url: url,
                  snippet: snippetMatch ? this.cleanText(snippetMatch[1]) : `Position at ${companyMatch ? this.cleanText(companyMatch[1]) : "a company"}`,
                  source: "Indeed",
                  salary: salaryMatch ? this.cleanText(salaryMatch[1]) : undefined
                });
              }
              
              return results;
            }
          }
          
          // Fallback extraction for Indeed
          if (html.length > 1000) {
            const titleMatches = html.match(/<h2[^>]*>(.*?)<\/h2>/g) || [];
            const companyMatches = html.match(/<span[^>]*company[^>]*>(.*?)<\/span>/g) || [];
            
            if (titleMatches.length > 0) {
              console.log(`Found ${titleMatches.length} potential Indeed job titles with fallback extraction`);
              
              const results: SearchResult[] = [];
              for (let i = 0; i < Math.min(titleMatches.length, 5); i++) {
                results.push({
                  title: this.cleanText(titleMatches[i]),
                  company: companyMatches[i] ? this.cleanText(companyMatches[i]) : "Indeed Listing",
                  location: "Various Locations",
                  date: "Recent",
                  url: url,
                  snippet: `Job opportunity related to ${searchTerm}`,
                  source: "Indeed"
                });
              }
              
              return results;
            }
          }
          
          console.log("No Indeed job listings found with any extraction pattern");
          return [];
        } catch (error) {
          console.error("Error scraping Indeed:", error);
          return [];
        }
      }
    }

    let results: SearchResult[] = [];
    
    // Determine which providers to scrape based on user selection
    const shouldScrapeGoogle = !provider || provider === 'google';
    const shouldScrapeLinkedIn = !provider || provider === 'linkedin';
    const shouldScrapeIndeed = !provider || provider === 'indeed';
    
    // Create scrapers and fetch results
    const scrapers = [];
    
    if (shouldScrapeGoogle) {
      scrapers.push(new AgnoScraper('google', headers).scrapeJobs(searchTerm));
    }
    
    if (shouldScrapeLinkedIn) {
      scrapers.push(new AgnoScraper('linkedin', headers).scrapeJobs(searchTerm));
    }
    
    if (shouldScrapeIndeed) {
      scrapers.push(new AgnoScraper('indeed', headers).scrapeJobs(searchTerm));
    }
    
    // Wait for all scrapers with a timeout
    const timeout = new Promise<SearchResult[][]>(resolve => 
      setTimeout(() => resolve([]), 25000)
    );
    
    const resultsArrays = await Promise.race([
      Promise.all(scrapers),
      timeout
    ]) as SearchResult[][];
    
    // Combine all results
    for (const array of resultsArrays) {
      results = [...results, ...array];
    }
    
    console.log(`Scraped ${results.length} total job listings from all providers`);
    
    // No fallback generation, just return whatever real results we found
    // Add unique identifiers to help with display
    const enhancedResults = results.map((result, index) => ({
      ...result,
      id: `${result.source}-${index}`
    }));
    
    // Log results breakdown
    console.log(`Returning ${enhancedResults.length} real job listings`);

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
