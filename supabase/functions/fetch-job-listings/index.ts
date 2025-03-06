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
  private apiSecret: string | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private supabaseClient: any;

  constructor(private provider: string, private headers: Record<string, string>) {
    this.supabaseClient = null; // Will be initialized if needed
  }
  
  // Retrieve API key for a service from the database
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
      console.log(`Attempting to retrieve API credentials for ${this.provider}...`);
      const { data, error } = await this.supabaseClient
        .from('job_api_credentials')
        .select('api_key, api_secret, access_token, refresh_token, expires_at')
        .eq('service', this.provider)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching API credentials for ${this.provider}:`, error);
        return false;
      }

      if (!data) {
        console.log(`No API credentials found for ${this.provider}`);
        return false;
      }

      console.log(`Found API credentials for ${this.provider}`);
      this.apiKey = data.api_key;
      this.apiSecret = data.api_secret;
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      
      // Check if access token is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        console.log(`Access token for ${this.provider} is expired, attempting to refresh...`);
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) {
          console.log(`Failed to refresh ${this.provider} access token, falling back to scraping`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error getting API credentials for ${this.provider}:`, error);
      return false;
    }
  }
  
  // Refresh an expired access token (to be implemented by provider-specific classes)
  protected async refreshAccessToken(): Promise<boolean> {
    // Default implementation does nothing
    console.log(`No refresh token implementation for ${this.provider}`);
    return false;
  }
  
  // Store updated tokens in the database
  protected async updateTokens(accessToken: string, refreshToken: string | null, expiresAt: Date | null): Promise<boolean> {
    if (!this.supabaseClient) return false;
    
    try {
      const { error } = await this.supabaseClient
        .from('job_api_credentials')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt?.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('service', this.provider);
        
      if (error) {
        console.error(`Error updating tokens for ${this.provider}:`, error);
        return false;
      }
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      return true;
    } catch (error) {
      console.error(`Error updating tokens for ${this.provider}:`, error);
      return false;
    }
  }

  // Common fetch function with retry and error handling
  protected async fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        // Add authorization header if we have an access token
        const authHeaders: Record<string, string> = {};
        if (this.accessToken && this.provider !== 'indeed') {
          authHeaders['Authorization'] = `Bearer ${this.accessToken}`;
        } else if (this.apiKey && this.provider === 'indeed') {
          // Indeed uses a different auth mechanism
          authHeaders['Indeed-Client-Application-Id'] = this.apiKey;
        }
        
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.headers,
            ...authHeaders,
            ...(options.headers || {}),
          },
        });
        
        if (response.ok) return response;
        
        if (response.status === 401 && this.refreshToken) {
          console.log(`Auth token expired for ${this.provider}, attempting to refresh...`);
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Try again with new token
            continue;
          }
        }
        
        if (response.status === 429) {
          console.log(`Rate limit hit for ${url}, waiting before retry...`);
          await delay(Math.pow(2, i) * 1000 + Math.random() * 1000); // Exponential backoff with jitter
          continue;
        }
        
        lastError = new Error(`HTTP error ${response.status}: ${await response.text()}`);
      } catch (error) {
        console.error(`Fetch error (attempt ${i+1}/${retries}):`, error);
        lastError = error;
        await delay(Math.pow(2, i) * 1000 + Math.random() * 1000);
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
    
    if (hasCredentials && (this.apiKey || this.accessToken)) {
      // Use official API if credentials are available
      try {
        console.log(`Using official API for ${this.provider}`);
        return await this.searchWithOfficialAPI(query);
      } catch (error) {
        console.error(`Error with official ${this.provider} API:`, error);
        console.log(`Falling back to scraping for ${this.provider}`);
        return this.scrapeResults(query);
      }
    } else {
      // Fall back to web scraping if no credentials
      console.log(`No valid credentials for ${this.provider}, using scraping`);
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

// LinkedIn API/scraping implementation - now using mocked data
class LinkedInJobService extends JobAPIService {
  constructor(headers: Record<string, string>) {
    super('linkedin', headers);
  }

  protected async searchWithOfficialAPI(query: string): Promise<SearchResult[]> {
    // Mock data since we don't have paid API access
    return this.getMockResults(query, "LinkedIn");
  }

  protected async scrapeResults(query: string): Promise<SearchResult[]> {
    // Mock data since we're reverting to mock
    return this.getMockResults(query, "LinkedIn");
  }

  private getMockResults(query: string, source: string): SearchResult[] {
    // Generate 5-8 mock results
    const count = 5 + Math.floor(Math.random() * 4);
    const results: SearchResult[] = [];
    
    const jobTitles = [
      `Senior ${query} Developer`,
      `${query} Engineer`,
      `${query} Architect`,
      `Lead ${query} Developer`,
      `${query} Specialist`,
      `Full Stack ${query} Developer`,
      `${query} Data Analyst`,
      `${query} Solutions Engineer`
    ];
    
    const companies = [
      "TechCorp Global",
      "InnovateSoft Inc",
      "DataSystems LLC",
      "FutureTech Solutions",
      "CodeMasters Enterprise",
      "Digital Innovations Group",
      "NextGen Software",
      "ByteWorks Technologies"
    ];
    
    const locations = [
      "Remote",
      "New York, NY",
      "San Francisco, CA",
      "Austin, TX",
      "Boston, MA",
      "Seattle, WA",
      "Chicago, IL",
      "Denver, CO"
    ];
    
    for (let i = 0; i < count; i++) {
      const titleIndex = Math.floor(Math.random() * jobTitles.length);
      const companyIndex = Math.floor(Math.random() * companies.length);
      const locationIndex = Math.floor(Math.random() * locations.length);
      
      results.push({
        title: jobTitles[titleIndex],
        company: companies[companyIndex],
        location: locations[locationIndex],
        date: "Posted recently",
        url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}`,
        snippet: `We are looking for an experienced ${query} professional to join our team. The ideal candidate will have strong skills in ${query} and related technologies.`,
        source: source,
        salary: `$${90 + Math.floor(Math.random() * 60)}K - $${150 + Math.floor(Math.random() * 50)}K`,
        jobType: ["Full-time", "Contract", "Part-time"][Math.floor(Math.random() * 3)]
      });
    }
    
    return results;
  }
}

// Indeed API/scraping implementation - now using mocked data
class IndeedJobService extends JobAPIService {
  constructor(headers: Record<string, string>) {
    super('indeed', headers);
  }

  protected async searchWithOfficialAPI(query: string): Promise<SearchResult[]> {
    // Mock data since we don't have paid API access
    return this.getMockResults(query, "Indeed");
  }

  protected async scrapeResults(query: string): Promise<SearchResult[]> {
    // Mock data since we're reverting to mock
    return this.getMockResults(query, "Indeed");
  }

  private getMockResults(query: string, source: string): SearchResult[] {
    // Generate 5-8 mock results
    const count = 5 + Math.floor(Math.random() * 4);
    const results: SearchResult[] = [];
    
    const jobTitles = [
      `${query} Developer`,
      `Senior ${query} Engineer`,
      `${query} Team Lead`,
      `${query} Consultant`,
      `${query} Project Manager`,
      `Junior ${query} Developer`,
      `${query} Systems Analyst`,
      `${query} Application Developer`
    ];
    
    const companies = [
      "Global Systems Inc",
      "Tech Innovators",
      "Enterprise Solutions",
      "Digital Frontier",
      "NextLevel Technologies",
      "Apex Software Group",
      "DataCore Systems",
      "Insight Technology Partners"
    ];
    
    const locations = [
      "Remote",
      "Los Angeles, CA",
      "Miami, FL",
      "Dallas, TX",
      "Atlanta, GA",
      "Portland, OR",
      "Washington DC",
      "Phoenix, AZ"
    ];
    
    for (let i = 0; i < count; i++) {
      const titleIndex = Math.floor(Math.random() * jobTitles.length);
      const companyIndex = Math.floor(Math.random() * companies.length);
      const locationIndex = Math.floor(Math.random() * locations.length);
      
      results.push({
        title: jobTitles[titleIndex],
        company: companies[companyIndex],
        location: locations[locationIndex],
        date: `${1 + Math.floor(Math.random() * 14)} days ago`,
        url: `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}`,
        snippet: `${companies[companyIndex]} is seeking a talented ${query} professional. This role requires expertise in ${query} and related tools. Join our innovative team and work on exciting projects.`,
        source: source,
        salary: `$${90 + Math.floor(Math.random() * 60)}K - $${150 + Math.floor(Math.random() * 50)}K yearly`,
        jobType: ["Full-time", "Contract", "Part-time"][Math.floor(Math.random() * 3)]
      });
    }
    
    return results;
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

// New Arbeitnow Job API Service
class ArbeitnowJobService extends JobAPIService {
  constructor(headers: Record<string, string>) {
    super('arbeitnow', headers);
  }

  protected async searchWithOfficialAPI(query: string): Promise<SearchResult[]> {
    return this.fetchArbeitnowJobs(query);
  }

  protected async scrapeResults(query: string): Promise<SearchResult[]> {
    return this.fetchArbeitnowJobs(query);
  }

  private async fetchArbeitnowJobs(query: string): Promise<SearchResult[]> {
    try {
      // Construct the API URL
      const apiUrl = `https://www.arbeitnow.com/api/job-board-api`;
      
      console.log(`Fetching Arbeitnow jobs with query: ${query}`);
      
      // Fetch jobs from Arbeitnow API
      const response = await this.fetchWithRetry(apiUrl);
      const data = await response.json();
      
      console.log(`Arbeitnow API returned ${data.data?.length || 0} total jobs`);
      
      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
        console.log('No jobs found in Arbeitnow API response');
        return [];
      }
      
      // Filter jobs by query terms if provided
      let filteredJobs = data.data;
      if (query) {
        const queryLower = query.toLowerCase();
        const searchTerms = queryLower.split(/\s+/);
        
        filteredJobs = data.data.filter((job: any) => {
          const titleLower = (job.title || '').toLowerCase();
          const descriptionLower = (job.description || '').toLowerCase();
          const companyLower = (job.company_name || '').toLowerCase();
          const tagsLower = (job.tags || []).map((tag: string) => tag.toLowerCase());
          
          // Check if any search term is found in the job data
          return searchTerms.some(term => 
            titleLower.includes(term) || 
            descriptionLower.includes(term) || 
            companyLower.includes(term) ||
            tagsLower.some((tag: string) => tag.includes(term))
          );
        });
      }
      
      console.log(`Filtered to ${filteredJobs.length} matching Arbeitnow jobs`);
      
      // Take top 10 jobs
      const topJobs = filteredJobs.slice(0, 10);
      
      // Transform to standard format
      const results = topJobs.map((job: any) => ({
        title: job.title || "Job Opening",
        company: job.company_name || "Company on Arbeitnow",
        location: job.location || job.remote ? "Remote" : "Various Locations",
        date: new Date(job.created_at || Date.now()).toLocaleDateString(),
        url: job.url || `https://www.arbeitnow.com/view/job/${job.slug}`,
        snippet: this.truncateHtml(job.description) || `Job opening at ${job.company_name || "a company"}`,
        source: "Arbeitnow",
        jobType: job.remote ? "Remote" : "On-site",
        salary: job.salary || undefined
      }));
      
      return results;
    } catch (error) {
      console.error("Error fetching Arbeitnow jobs:", error);
      return [];
    }
  }
  
  // Helper to truncate and clean HTML for snippets
  private truncateHtml(html: string | undefined): string {
    if (!html) return "";
    
    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, ' ');
    
    // Remove excess whitespace
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Truncate to reasonable snippet length
    return cleaned.length > 200 ? cleaned.substring(0, 200) + "..." : cleaned;
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
    const arbeitnowService = new ArbeitnowJobService(headers);
    
    // Determine which providers to use based on user selection
    const services = [];
    if (!provider || provider === 'linkedin') services.push(linkedInService.search(searchTerm));
    if (!provider || provider === 'indeed') services.push(indeedService.search(searchTerm));
    if (!provider || provider === 'google') services.push(googleService.search(searchTerm));
    if (!provider || provider === 'arbeitnow') services.push(arbeitnowService.search(searchTerm));
    
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
