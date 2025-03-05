
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

// Job API Service class for different providers
class JobAPIService {
  private apiKey: string | null = null;
  private supabaseClient: any;

  constructor(private provider: string, private headers: Record<string, string>) {
    this.supabaseClient = null; // Will be initialized if needed
  }
  
  // Retrieve API key for a service from the database
  // Only used when we have official API access
  private async getAPICredentials(): Promise<boolean> {
    if (!this.supabaseClient) {
      // Import dynamically to avoid issues with Deno
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.38.0");
      this.supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
    }

    try {
      const { data, error } = await this.supabaseClient
        .from('job_api_credentials')
        .select('api_key, api_secret, access_token')
        .eq('service', this.provider)
        .single();

      if (error || !data) {
        console.log(`No API credentials found for ${this.provider}`);
        return false;
      }

      this.apiKey = data.api_key;
      return true;
    } catch (error) {
      console.error(`Error getting API credentials for ${this.provider}:`, error);
      return false;
    }
  }

  // Common fetch function with retry and error handling
  protected async fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.headers,
            ...(options.headers || {}),
          },
        });
        
        if (response.ok) return response;
        
        if (response.status === 429) {
          console.log(`Rate limit hit for ${url}, waiting before retry...`);
          await delay(Math.pow(2, i) * 1000); // Exponential backoff
          continue;
        }
        
        lastError = new Error(`HTTP error ${response.status}: ${await response.text()}`);
      } catch (error) {
        console.error(`Fetch error (attempt ${i+1}/${retries}):`, error);
        lastError = error;
        await delay(Math.pow(2, i) * 1000);
      }
    }
    throw lastError;
  }

  // Process search results into a standardized format
  protected processResults(results: any[]): SearchResult[] {
    return results.map(result => ({
      title: result.title || "Unknown Position",
      company: result.company || "Unknown Company",
      location: result.location || "Remote",
      date: result.date || "Recent",
      url: result.url || "",
      snippet: result.description || result.snippet || `Job at ${result.company || "a company"}`,
      source: this.provider,
      salary: result.salary,
      jobType: result.jobType
    }));
  }

  // Main search method to be implemented by each provider
  async search(query: string): Promise<SearchResult[]> {
    // Try to get API credentials first
    const hasCredentials = await this.getAPICredentials();
    
    if (hasCredentials && this.apiKey) {
      // Use official API if credentials are available
      return this.searchWithOfficialAPI(query);
    } else {
      // Fall back to web scraping if no credentials
      return this.scrapeResults(query);
    }
  }

  // Official API search implementation (to be overridden)
  protected async searchWithOfficialAPI(query: string): Promise<SearchResult[]> {
    console.log(`No official API implementation for ${this.provider}`);
    return this.scrapeResults(query);
  }

  // Web scraping implementation (to be overridden)
  protected async scrapeResults(query: string): Promise<SearchResult[]> {
    console.log(`No scraping implementation for ${this.provider}`);
    return [];
  }
}

// LinkedIn API/scraping implementation
class LinkedInJobService extends JobAPIService {
  constructor(headers: Record<string, string>) {
    super('linkedin', headers);
  }

  protected async searchWithOfficialAPI(query: string): Promise<SearchResult[]> {
    if (!this.apiKey) return this.scrapeResults(query);
    
    try {
      // Official LinkedIn API implementation
      // Note: LinkedIn API requires OAuth 2.0 which is complex to implement here
      // For now, we'll implement a more robust scraping solution
      console.log('LinkedIn API requires OAuth flow, falling back to scraping');
      return this.scrapeResults(query);
    } catch (error) {
      console.error('LinkedIn API error:', error);
      return this.scrapeResults(query);
    }
  }

  protected async scrapeResults(query: string): Promise<SearchResult[]> {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}&sortBy=R`;
    
    try {
      // Add random delay to avoid detection
      await delay(Math.random() * 2000 + 1000);
      
      const response = await this.fetchWithRetry(url);
      const html = await response.text();
      
      if (html.includes('captcha') || html.includes('CAPTCHA')) {
        console.log('LinkedIn CAPTCHA detected, unable to scrape');
        return [];
      }
      
      console.log(`LinkedIn HTML size: ${html.length} bytes`);
      
      // Enhanced regex patterns for LinkedIn
      const patterns = [
        // Pattern 1: Modern LinkedIn job cards
        {
          card: /<div\s+class="base-card[^>]*>(.*?)<\/div><\/div><\/div>/gs,
          title: /<h3\s+class="[^"]*base-search-card__title[^"]*"[^>]*>(.*?)<\/h3>/s,
          company: /<h4\s+class="[^"]*base-search-card__subtitle[^"]*"[^>]*>(.*?)<\/h4>/s,
          location: /<span\s+class="[^"]*job-search-card__location[^"]*"[^>]*>(.*?)<\/span>/s,
          date: /<time[^>]*datetime="([^"]*)"[^>]*>/s,
          url: /href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/
        },
        // Pattern 2: Alternative LinkedIn layout
        {
          card: /<li\s+data-occludable-job-id[^>]*>(.*?)<\/li>/gs,
          title: /<a\s+class="[^"]*job-card-list__title[^"]*"[^>]*>(.*?)<\/a>/s,
          company: /<a\s+class="[^"]*job-card-container__company-name[^"]*"[^>]*>(.*?)<\/a>/s,
          location: /<li\s+class="[^"]*job-card-container__metadata-item[^"]*"[^>]*>(.*?)<\/li>/s,
          url: /href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/
        }
      ];
      
      // Try each pattern set
      for (const pattern of patterns) {
        const jobCards = Array.from(html.matchAll(pattern.card));
        console.log(`Found ${jobCards.length} LinkedIn job cards with pattern`);
        
        if (jobCards.length > 0) {
          const results: SearchResult[] = [];
          
          for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
            const card = jobCards[i][0];
            
            // Extract job data using regex
            const titleMatch = card.match(pattern.title);
            const companyMatch = card.match(pattern.company);
            const locationMatch = card.match(pattern.location);
            const dateMatch = card.match(pattern.date);
            const urlMatch = card.match(pattern.url);
            
            // Skip if we couldn't extract critical info
            if (!titleMatch && !companyMatch) continue;
            
            // Clean the text by removing HTML tags
            const cleanText = (text: string = '') => 
              text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
            
            results.push({
              title: titleMatch ? cleanText(titleMatch[1]) : "LinkedIn Job",
              company: companyMatch ? cleanText(companyMatch[1]) : "Company on LinkedIn",
              location: locationMatch ? cleanText(locationMatch[1]) : "Various Locations",
              date: dateMatch ? new Date(dateMatch[1]).toLocaleDateString() : "Recent",
              url: urlMatch ? urlMatch[1] : url,
              snippet: `Job opening at ${companyMatch ? cleanText(companyMatch[1]) : "a company"} for ${titleMatch ? cleanText(titleMatch[1]) : "a position"}`,
              source: "LinkedIn"
            });
          }
          
          if (results.length > 0) {
            console.log(`Successfully extracted ${results.length} LinkedIn jobs`);
            return results;
          }
        }
      }
      
      // Extract any job information we can find
      const titleMatches = html.match(/<h3[^>]*>(.*?)<\/h3>/g) || [];
      const companyMatches = html.match(/<h4[^>]*>(.*?)<\/h4>/g) || [];
      
      if (titleMatches.length > 0) {
        const fallbackResults: SearchResult[] = [];
        const cleanText = (text: string) => text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
        
        for (let i = 0; i < Math.min(titleMatches.length, 5); i++) {
          fallbackResults.push({
            title: cleanText(titleMatches[i]),
            company: companyMatches[i] ? cleanText(companyMatches[i]) : "Company on LinkedIn",
            location: "Various Locations",
            date: "Recent",
            url: url,
            snippet: `Job opening related to ${query}`,
            source: "LinkedIn"
          });
        }
        
        console.log(`Extracted ${fallbackResults.length} LinkedIn jobs with fallback method`);
        return fallbackResults;
      }
      
      console.log("No LinkedIn jobs found");
      return [];
    } catch (error) {
      console.error("LinkedIn scraping error:", error);
      return [];
    }
  }
}

// Indeed API/scraping implementation
class IndeedJobService extends JobAPIService {
  constructor(headers: Record<string, string>) {
    super('indeed', headers);
  }

  protected async searchWithOfficialAPI(query: string): Promise<SearchResult[]> {
    if (!this.apiKey) return this.scrapeResults(query);
    
    try {
      // Official Indeed API implementation
      // Note: Since 2022, Indeed has restricted access to their API
      console.log('Indeed API requires partnership access, falling back to scraping');
      return this.scrapeResults(query);
    } catch (error) {
      console.error('Indeed API error:', error);
      return this.scrapeResults(query);
    }
  }

  protected async scrapeResults(query: string): Promise<SearchResult[]> {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.indeed.com/jobs?q=${encodedQuery}&sort=date`;
    
    try {
      // Add random delay to avoid detection
      await delay(Math.random() * 2000 + 1000);
      
      const response = await this.fetchWithRetry(url);
      const html = await response.text();
      
      if (html.includes('captcha') || html.includes('CAPTCHA')) {
        console.log('Indeed CAPTCHA detected, unable to scrape');
        return [];
      }
      
      console.log(`Indeed HTML size: ${html.length} bytes`);
      
      // Enhanced regex patterns for Indeed
      const patterns = [
        // Pattern 1: Modern Indeed job cards
        {
          card: /<div\s+class="[^"]*job_seen_beacon[^"]*"[^>]*>(.*?)<\/div><\/div><\/div><\/div>/gs,
          title: /<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>(.*?)<\/h2>/s,
          company: /<span[^>]*class="[^"]*companyName[^"]*"[^>]*>(.*?)<\/span>/s,
          location: /<div[^>]*class="[^"]*companyLocation[^"]*"[^>]*>(.*?)<\/div>/s,
          salary: /<span[^>]*class="[^"]*salary[^"]*"[^>]*>(.*?)<\/span>/s,
          snippet: /<div[^>]*class="[^"]*job-snippet[^"]*"[^>]*>(.*?)<\/div>/s,
          url: /href="(\/viewjob\?[^"]+)"/
        },
        // Pattern 2: Alternative Indeed layout
        {
          card: /<div\s+id="jobsearch-ViewjobPaneWrapper[^>]*>(.*?)<\/div><\/div><\/div>/gs,
          title: /<h2[^>]*class="[^"]*jobsearch-JobInfoHeader-title[^"]*"[^>]*>(.*?)<\/h2>/s,
          company: /<div[^>]*class="[^"]*jobsearch-InlineCompanyRating[^"]*"[^>]*>(.*?)<\/div>/s,
          location: /<div[^>]*class="[^"]*jobsearch-JobInfoHeader-subtitle[^"]*"[^>]*>(.*?)<\/div>/s,
          salary: /<span[^>]*class="[^"]*jobsearch-JobMetadataHeader-item[^"]*"[^>]*>\$(.*?)<\/span>/s,
          snippet: /<div[^>]*id="jobDescriptionText"[^>]*>(.*?)<\/div>/s
        }
      ];
      
      // Try each pattern set
      for (const pattern of patterns) {
        const jobCards = Array.from(html.matchAll(pattern.card));
        console.log(`Found ${jobCards.length} Indeed job cards with pattern`);
        
        if (jobCards.length > 0) {
          const results: SearchResult[] = [];
          
          for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
            const card = jobCards[i][0];
            
            // Extract job data using regex
            const titleMatch = card.match(pattern.title);
            const companyMatch = card.match(pattern.company);
            const locationMatch = card.match(pattern.location);
            const salaryMatch = card.match(pattern.salary);
            const snippetMatch = card.match(pattern.snippet);
            const urlMatch = card.match(pattern.url);
            
            // Skip if we couldn't extract critical info
            if (!titleMatch && !companyMatch) continue;
            
            // Clean the text by removing HTML tags
            const cleanText = (text: string = '') => 
              text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
            
            results.push({
              title: titleMatch ? cleanText(titleMatch[1]) : "Indeed Job",
              company: companyMatch ? cleanText(companyMatch[1]) : "Company on Indeed",
              location: locationMatch ? cleanText(locationMatch[1]) : "Various Locations",
              date: "Recent",
              url: urlMatch ? `https://www.indeed.com${urlMatch[1]}` : url,
              snippet: snippetMatch ? cleanText(snippetMatch[1].substring(0, 150)) + "..." : 
                        `Job opening at ${companyMatch ? cleanText(companyMatch[1]) : "a company"}`,
              source: "Indeed",
              salary: salaryMatch ? cleanText(salaryMatch[1]) : undefined
            });
          }
          
          if (results.length > 0) {
            console.log(`Successfully extracted ${results.length} Indeed jobs`);
            return results;
          }
        }
      }
      
      // Extract any job information we can find
      const titleMatches = html.match(/<h2[^>]*jobTitle[^>]*>(.*?)<\/h2>/g) || [];
      const companyMatches = html.match(/<span[^>]*companyName[^>]*>(.*?)<\/span>/g) || [];
      
      if (titleMatches.length > 0) {
        const fallbackResults: SearchResult[] = [];
        const cleanText = (text: string) => text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
        
        for (let i = 0; i < Math.min(titleMatches.length, 5); i++) {
          fallbackResults.push({
            title: cleanText(titleMatches[i]),
            company: companyMatches[i] ? cleanText(companyMatches[i]) : "Company on Indeed",
            location: "Various Locations",
            date: "Recent",
            url: url,
            snippet: `Job opening related to ${query}`,
            source: "Indeed"
          });
        }
        
        console.log(`Extracted ${fallbackResults.length} Indeed jobs with fallback method`);
        return fallbackResults;
      }
      
      console.log("No Indeed jobs found");
      return [];
    } catch (error) {
      console.error("Indeed scraping error:", error);
      return [];
    }
  }
}

// Google Jobs API/scraping implementation
class GoogleJobService extends JobAPIService {
  constructor(headers: Record<string, string>) {
    super('google', headers);
  }

  protected async searchWithOfficialAPI(query: string): Promise<SearchResult[]> {
    // Google doesn't have an official jobs API
    return this.scrapeResults(query);
  }

  protected async scrapeResults(query: string): Promise<SearchResult[]> {
    const encodedQuery = encodeURIComponent(`${query} jobs`);
    const url = `https://www.google.com/search?q=${encodedQuery}&ibp=htl;jobs`;
    
    try {
      // Add random delay to avoid detection
      await delay(Math.random() * 2000 + 1000);
      
      const response = await this.fetchWithRetry(url);
      const html = await response.text();
      
      if (html.includes('captcha') || html.includes('CAPTCHA')) {
        console.log('Google CAPTCHA detected, unable to scrape');
        return [];
      }
      
      console.log(`Google HTML size: ${html.length} bytes`);
      
      // Enhanced regex patterns for Google Jobs
      const patterns = [
        // Pattern 1: Modern Google Jobs cards
        {
          card: /<div\s+class="[^"]*BjJfJf[^"]*"[^>]*>.*?<\/div><\/div><\/div><\/div>/gs,
          title: /<h2[^>]*class="[^"]*BjJfJf[^"]*"[^>]*>(.*?)<\/h2>/s,
          company: /<div[^>]*class="[^"]*vNEEBe[^"]*"[^>]*>(.*?)<\/div>/s,
          location: /<div[^>]*class="[^"]*Qk80Jf[^"]*"[^>]*>(.*?)<\/div>/s,
          snippet: /<span[^>]*class="[^"]*HBvzbc[^"]*"[^>]*>(.*?)<\/span>/s,
          url: /data-ved="([^"]+)"/
        },
        // Pattern 2: Alternative Google Jobs layout
        {
          card: /<div\s+jscontroller="[^"]*"[^>]*jsdata="[^"]*"[^>]*class="[^"]*"[^>]*>(.*?)<\/div><\/g-card>/gs,
          title: /<div[^>]*role="heading"[^>]*>(.*?)<\/div>/s,
          company: /<div[^>]*class="[^"]*"[^>]*data-company-name[^>]*>(.*?)<\/div>/s,
          location: /<div[^>]*class="[^"]*"[^>]*data-location[^>]*>(.*?)<\/div>/s,
          snippet: /<div[^>]*data-snippet[^>]*>(.*?)<\/div>/s
        }
      ];
      
      // Try each pattern set
      for (const pattern of patterns) {
        const jobCards = Array.from(html.matchAll(pattern.card));
        console.log(`Found ${jobCards.length} Google job cards with pattern`);
        
        if (jobCards.length > 0) {
          const results: SearchResult[] = [];
          
          for (let i = 0; i < Math.min(jobCards.length, 10); i++) {
            const card = jobCards[i][0];
            
            // Extract job data using regex
            const titleMatch = card.match(pattern.title);
            const companyMatch = card.match(pattern.company);
            const locationMatch = card.match(pattern.location);
            const snippetMatch = card.match(pattern.snippet);
            
            // Skip if we couldn't extract critical info
            if (!titleMatch && !companyMatch) continue;
            
            // Clean the text by removing HTML tags
            const cleanText = (text: string = '') => 
              text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
            
            results.push({
              title: titleMatch ? cleanText(titleMatch[1]) : "Google Jobs Listing",
              company: companyMatch ? cleanText(companyMatch[1]) : "Company via Google Jobs",
              location: locationMatch ? cleanText(locationMatch[1]) : "Various Locations",
              date: "Recent",
              url: url,
              snippet: snippetMatch ? cleanText(snippetMatch[1]) : 
                        `Job opening at ${companyMatch ? cleanText(companyMatch[1]) : "a company"}`,
              source: "Google Jobs"
            });
          }
          
          if (results.length > 0) {
            console.log(`Successfully extracted ${results.length} Google jobs`);
            return results;
          }
        }
      }
      
      // Extract any job information we can find as a fallback
      const titleMatches = html.match(/<h3[^>]*>(.*?)<\/h3>/g) || [];
      const companyMatches = html.match(/<div[^>]*vNEEBe[^>]*>(.*?)<\/div>/g) || [];
      
      if (titleMatches.length > 0) {
        const fallbackResults: SearchResult[] = [];
        const cleanText = (text: string) => text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
        
        for (let i = 0; i < Math.min(titleMatches.length, 5); i++) {
          fallbackResults.push({
            title: cleanText(titleMatches[i]),
            company: companyMatches[i] ? cleanText(companyMatches[i]) : "Company via Google",
            location: "Various Locations",
            date: "Recent",
            url: url,
            snippet: `Job opening related to ${query}`,
            source: "Google Jobs"
          });
        }
        
        console.log(`Extracted ${fallbackResults.length} Google jobs with fallback method`);
        return fallbackResults;
      }
      
      console.log("No Google jobs found");
      return [];
    } catch (error) {
      console.error("Google scraping error:", error);
      return [];
    }
  }
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

    // Initialize service instances for each provider
    const linkedInService = new LinkedInJobService(headers);
    const indeedService = new IndeedJobService(headers);
    const googleService = new GoogleJobService(headers);
    
    // Determine which providers to use based on user selection
    const services = [];
    if (!provider || provider === 'linkedin') services.push(linkedInService.search(searchTerm));
    if (!provider || provider === 'indeed') services.push(indeedService.search(searchTerm));
    if (!provider || provider === 'google') services.push(googleService.search(searchTerm));
    
    // Set a timeout for all scraping operations
    const timeout = new Promise<SearchResult[][]>(resolve => 
      setTimeout(() => {
        console.log("Search timeout reached");
        resolve([]);
      }, 25000)
    );
    
    // Wait for all providers or timeout
    const results = await Promise.race([
      Promise.all(services),
      timeout
    ]) as SearchResult[][];
    
    // Combine and deduplicate results
    const combinedResults: SearchResult[] = [];
    const seenTitles = new Set<string>();
    
    for (const providerResults of results) {
      for (const result of providerResults) {
        // Simple deduplication based on title + company
        const key = `${result.title.toLowerCase().trim()}-${result.company.toLowerCase().trim()}`;
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          combinedResults.push(result);
        }
      }
    }
    
    console.log(`Retrieved ${combinedResults.length} unique job listings`);
    
    // Add unique IDs to results
    const enhancedResults = combinedResults.map((result, index) => ({
      ...result,
      id: `${result.source}-${index}`
    }));
    
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
