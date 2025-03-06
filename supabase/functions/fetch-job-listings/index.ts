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
  private email: string | null = null;
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
        .select('api_key, api_secret, access_token, refresh_token, expires_at, email')
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
      this.email = data.email;
      
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
        if (this.accessToken && this.provider !== 'indeed' && this.provider !== 'usajobs') {
          authHeaders['Authorization'] = `Bearer ${this.accessToken}`;
        } else if (this.apiKey && this.provider === 'indeed') {
          // Indeed uses a different auth mechanism
          authHeaders['Indeed-Client-Application-Id'] = this.apiKey;
        } else if (this.apiKey && this.provider === 'jobdataapi') {
          // JobDataAPI uses API key in header
          authHeaders['X-API-KEY'] = this.apiKey;
        } else if (this.apiKey && this.provider === 'usajobs') {
          // USAJobs API uses special headers
          authHeaders['Authorization-Key'] = this.apiKey;
          if (this.email) {
            authHeaders['User-Agent'] = this.email;
          }
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

// Arbeitnow Job API Service
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

// JobDataAPI Service
class JobDataAPIService extends JobAPIService {
  constructor(headers: Record<string, string>) {
    super('jobdataapi', headers);
  }

  protected async searchWithOfficialAPI(query: string): Promise<SearchResult[]> {
    try {
      // Check if we have API credentials
      if (!this.apiKey) {
        console.log('No API key found for JobDataAPI');
        return [];
      }

      // Construct the API URL with search parameters
      const encodedQuery = encodeURIComponent(query);
      const apiUrl = `https://jobdataapi.com/api/v1/search?query=${encodedQuery}&limit=20`;
      
      console.log(`Fetching jobs from JobDataAPI with query: ${query}`);
      
      // Fetch jobs from the API
      const response = await this.fetchWithRetry(apiUrl);
      const data = await response.json();
      
      console.log(`JobDataAPI returned ${data.jobs?.length || 0} jobs`);
      
      if (!data.jobs || !Array.isArray(data.jobs) || data.jobs.length === 0) {
        console.log('No jobs found in JobDataAPI response');
        return [];
      }
      
      // Transform to standard format
      const results = data.jobs.map((job: any) => ({
        title: job.title || "Job Opening",
        company: job.company || "Unknown Company",
        location: job.location || "Various Locations",
        date: job.posted_date || "Recent",
        url: job.job_url || `https://jobdataapi.com/jobs?q=${encodedQuery}`,
        snippet: job.description || `Job opening at ${job.company || "a company"}`,
        source: "JobDataAPI",
        jobType: job.job_type || undefined,
        salary: job.salary_range || undefined
      }));
      
      console.log(`Processed ${results.length} jobs from JobDataAPI`);
      return results;
    } catch (error) {
      console.error("Error fetching jobs from JobDataAPI:", error);
      return [];
    }
  }

  // No scraping implementation as this is API-only
  protected async scrapeResults(query: string): Promise<SearchResult[]> {
    console.log('JobDataAPI does not support scraping, falling back to mock data');
    return this.getMockJobDataAPIResults(query);
  }
  
  // Mock results for when API is not available
  private getMockJobDataAPIResults(query: string): SearchResult[] {
    // Generate 5-8 mock results
    const count = 5 + Math.floor(Math.random() * 4);
    const results: SearchResult[] = [];
    
    const jobTitles = [
      `${query} Developer`,
      `Senior ${query} Engineer`,
      `${query} Specialist`,
      `${query} Analyst`,
      `${query} Manager`,
      `Lead ${query} Developer`,
      `${query} Architect`,
      `${query} Consultant`
    ];
    
    const companies = [
      "JobDataAPI Corp",
      "Data Solutions Inc",
      "TechJobs Unlimited",
      "Career Edge",
      "OpportunityConnect",
      "JobSphere",
      "WorkWave Technologies",
      "CareerBoost"
    ];
    
    const locations = [
      "Remote",
      "San Francisco, CA",
      "New York, NY",
      "Austin, TX",
      "Seattle, WA",
      "Boston, MA",
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
        date: `${1 + Math.floor(Math.random() * 30)} days ago`,
        url: `https://jobdataapi.com/jobs?q=${encodeURIComponent(query)}`,
        snippet: `${companies[companyIndex]} is looking for a talented ${query} professional to join our team. This role focuses on ${query} development and implementation.`,
        source: "JobDataAPI",
        salary: `$${100 + Math.floor(Math.random() * 50)}K - $${160 + Math.floor(Math.random() * 40)}K`,
        jobType: ["Full-time", "Contract", "Remote", "Hybrid"][Math.floor(Math.random() * 4)]
      });
    }
    
    return results;
  }
}

// NEW: USAJobs API Service
class USAJobsService extends JobAPIService {
  constructor(headers: Record<string, string>) {
    super('usajobs', headers);
  }

  protected async searchWithOfficialAPI(query: string): Promise<SearchResult[]> {
    try {
      // Check if we have API credentials
      if (!this.apiKey) {
        console.log('No API key found for USAJobs');
        return this.getMockResults(query);
      }

      // Construct the API URL with search parameters
      const encodedQuery = encodeURIComponent(query);
      const apiUrl = `https://data.usajobs.gov/api/search?Keyword=${encodedQuery}&ResultsPerPage=10`;
      
      console.log(`Fetching jobs from USAJobs with query: ${query}`);
      
      // Fetch jobs from the API
      const response = await this.fetchWithRetry(apiUrl);
      const data = await response.json();
      
      console.log(`USAJobs returned ${data.SearchResult?.SearchResultItems?.length || 0} jobs`);
      
      if (!data.SearchResult?.SearchResultItems || !Array.isArray(data.SearchResult.SearchResultItems) || data.SearchResult.SearchResultItems.length === 0) {
        console.log('No jobs found in USAJobs response');
        return [];
      }
      
      // Transform to standard format
      const results = data.SearchResult.SearchResultItems.map((item: any) => {
        const job = item.MatchedObjectDescriptor;
        return {
          title: job.PositionTitle || "Federal Job Opening",
          company: job.OrganizationName || "U.S. Government",
          location: job.PositionLocationDisplay || job.PositionLocation?.[0]?.LocationName || "Various Locations",
          date: job.PublicationStartDate ? new Date(job.PublicationStartDate).toLocaleDateString() : "Recent",
          url: job.PositionURI || `https://www.usajobs.gov/Search/Results?k=${encodedQuery}`,
          snippet: job.QualificationSummary || job.UserArea?.Details?.JobSummary || `Federal job opening at ${job.DepartmentName || "a U.S. Government agency"}`,
          source: "USAJobs",
          jobType: job.PositionSchedule?.[0]?.Name || undefined,
          salary: job.PositionRemuneration?.[0] ? 
            `$${job.PositionRemuneration[0].MinimumRange} - $${job.PositionRemuneration[0].MaximumRange} ${job.PositionRemuneration[0].RateIntervalCode}` : 
            undefined
        };
      });
      
      console.log(`Processed ${results.length} jobs from USAJobs`);
      return results;
    } catch (error) {
      console.error("Error fetching jobs from USAJobs:", error);
      return this.getMockResults(query);
    }
  }

  protected async scrapeResults(query: string): Promise<SearchResult[]> {
    console.log('USAJobs does not support scraping, falling back to mock data');
    return this.getMockResults(query);
  }
  
  // Mock results for when API is not available
  private getMockResults(query: string): SearchResult[] {
    // Generate 5-8 mock results
    const count = 5 + Math.floor(Math.random() * 4);
    const results: SearchResult[] = [];
    
    const jobTitles = [
      `${query} Specialist`,
      `${query} Analyst`,
      `Federal ${query} Manager`,
      `Government ${query} Advisor`,
      `${query} Program Officer`,
      `Senior ${query} Consultant`,
      `${query} Policy Advisor`,
      `${query} Operations Research`
    ];
    
    const agencies = [
      "Department of Defense",
      "Department of Homeland Security",
      "Department of Agriculture",
      "Department of Interior",
      "Department of Energy",
      "Department of Transportation",
      "Department of Veterans Affairs",
      "Department of Health and Human Services"
    ];
    
    const locations = [
      "Washington, DC",
      "Arlington, VA",
      "Alexandria, VA",
      "San Diego, CA",
      "San Antonio, TX",
      "Fort Meade, MD",
      "Denver, CO",
      "Nationwide"
    ];
    
    for (let i = 0; i < count; i++) {
      const
