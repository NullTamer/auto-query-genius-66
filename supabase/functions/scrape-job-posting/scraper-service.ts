
export class ScraperService {
  // Generic method to fetch HTML content
  async fetchPage(url: string): Promise<string> {
    console.log(`Fetching page content from: ${url}`);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log(`Successfully fetched page (${html.length} bytes)`);
      return html;
    } catch (error) {
      console.error(`Error fetching page from ${url}:`, error);
      throw error;
    }
  }

  async scrapeIndeedJobs(query: string, location = ''): Promise<Array<{title: string, company: string, description: string, url: string}>> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const encodedLocation = encodeURIComponent(location);
      const url = `https://www.indeed.com/jobs?q=${encodedQuery}${location ? `&l=${encodedLocation}` : ''}`;
      
      console.log(`Scraping Indeed jobs with URL: ${url}`);
      const html = await this.fetchPage(url);
      
      // Using regex to extract job cards since we don't have a proper DOM parser
      const jobResults: Array<{title: string, company: string, description: string, url: string}> = [];
      
      // Extract job cards - this is a simplified approach
      const jobCardRegex = /<div class="job_seen_beacon">(.*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gs;
      const jobCards = html.match(jobCardRegex) || [];
      
      console.log(`Found ${jobCards.length} potential job cards on Indeed`);
      
      for (const card of jobCards.slice(0, 10)) { // Limit to first 10 results for performance
        // Extract title
        const titleRegex = /<h2.*?><a.*?>(.*?)<\/a><\/h2>/s;
        const titleMatch = card.match(titleRegex);
        const title = titleMatch ? this.cleanHTML(titleMatch[1]) : 'Unknown Position';
        
        // Extract company
        const companyRegex = /<span class="companyName">(.*?)<\/span>/s;
        const companyMatch = card.match(companyRegex);
        const company = companyMatch ? this.cleanHTML(companyMatch[1]) : 'Unknown Company';
        
        // Extract snippet
        const snippetRegex = /<div class="job-snippet">(.*?)<\/div>/s;
        const snippetMatch = card.match(snippetRegex);
        const description = snippetMatch ? this.cleanHTML(snippetMatch[1]) : 'No description available';
        
        // Extract URL
        const urlRegex = /<h2.*?><a href="(.*?)".*?>/s;
        const urlMatch = card.match(urlRegex);
        let url = 'https://www.indeed.com';
        if (urlMatch && urlMatch[1]) {
          url += urlMatch[1].startsWith('/') ? urlMatch[1] : `/${urlMatch[1]}`;
        }
        
        jobResults.push({
          title,
          company,
          description,
          url
        });
      }
      
      console.log(`Successfully extracted ${jobResults.length} Indeed job listings`);
      return jobResults;
    } catch (error) {
      console.error('Error scraping Indeed jobs:', error);
      return [];
    }
  }
  
  async scrapeLinkedInJobs(query: string, location = ''): Promise<Array<{title: string, company: string, description: string, url: string}>> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const encodedLocation = encodeURIComponent(location);
      const url = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}${location ? `&location=${encodedLocation}` : ''}`;
      
      console.log(`Scraping LinkedIn jobs with URL: ${url}`);
      const html = await this.fetchPage(url);
      
      const jobResults: Array<{title: string, company: string, description: string, url: string}> = [];
      
      // Extract job cards - this is a simplified approach
      const jobCardRegex = /<div class="base-card relative.*?job-search-card.*?">(.*?)<\/div>\s*<\/div>\s*<\/div>/gs;
      const jobCards = html.match(jobCardRegex) || [];
      
      console.log(`Found ${jobCards.length} potential job cards on LinkedIn`);
      
      for (const card of jobCards.slice(0, 10)) { // Limit to first 10 results
        // Extract title
        const titleRegex = /<h3 class="base-search-card__title".*?>(.*?)<\/h3>/s;
        const titleMatch = card.match(titleRegex);
        const title = titleMatch ? this.cleanHTML(titleMatch[1]) : 'Unknown Position';
        
        // Extract company
        const companyRegex = /<h4 class="base-search-card__subtitle".*?>(.*?)<\/h4>/s;
        const companyMatch = card.match(companyRegex);
        const company = companyMatch ? this.cleanHTML(companyMatch[1]) : 'Unknown Company';
        
        // Extract snippet - LinkedIn doesn't usually show description in search results
        const description = `${title} at ${company}. Check the LinkedIn job posting for more details.`;
        
        // Extract URL
        const urlRegex = /<a class="base-card__full-link".*?href="(.*?)".*?>/s;
        const urlMatch = card.match(urlRegex);
        const url = urlMatch ? urlMatch[1] : 'https://www.linkedin.com/jobs/';
        
        jobResults.push({
          title,
          company,
          description,
          url
        });
      }
      
      console.log(`Successfully extracted ${jobResults.length} LinkedIn job listings`);
      return jobResults;
    } catch (error) {
      console.error('Error scraping LinkedIn jobs:', error);
      return [];
    }
  }
  
  async scrapeGoogleJobs(query: string, location = ''): Promise<Array<{title: string, company: string, description: string, url: string}>> {
    try {
      const encodedQuery = encodeURIComponent(`${query} jobs ${location}`);
      const url = `https://www.google.com/search?q=${encodedQuery}`;
      
      console.log(`Scraping Google jobs with URL: ${url}`);
      const html = await this.fetchPage(url);
      
      const jobResults: Array<{title: string, company: string, description: string, url: string}> = [];
      
      // Extract job listings - this is a simplified approach for Google
      const jobCardRegex = /<div class="g">(.*?)<\/div>\s*<\/div>\s*<\/div>/gs;
      const jobCards = html.match(jobCardRegex) || [];
      
      console.log(`Found ${jobCards.length} potential job cards on Google`);
      
      for (const card of jobCards.slice(0, 10)) { // Limit to first 10 results
        // Extract title
        const titleRegex = /<h3.*?>(.*?)<\/h3>/s;
        const titleMatch = card.match(titleRegex);
        const title = titleMatch ? this.cleanHTML(titleMatch[1]) : 'Unknown Position';
        
        // Extract snippet
        const snippetRegex = /<span class="aCOpRe">(.*?)<\/span>/s;
        const snippetMatch = card.match(snippetRegex);
        const description = snippetMatch ? this.cleanHTML(snippetMatch[1]) : 'No description available';
        
        // Extract URL
        const urlRegex = /<a href="(.*?)".*?>/s;
        const urlMatch = card.match(urlRegex);
        const url = urlMatch ? urlMatch[1] : 'https://www.google.com';
        
        // Extract company - not always available in Google results
        const company = 'From Google Search';
        
        jobResults.push({
          title,
          company,
          description,
          url
        });
      }
      
      console.log(`Successfully extracted ${jobResults.length} Google job listings`);
      return jobResults;
    } catch (error) {
      console.error('Error scraping Google jobs:', error);
      return [];
    }
  }
  
  // Helper to clean HTML strings
  private cleanHTML(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')  // Replace &nbsp; with spaces
      .replace(/&amp;/g, '&')   // Replace &amp; with &
      .replace(/&lt;/g, '<')    // Replace &lt; with <
      .replace(/&gt;/g, '>')    // Replace &gt; with >
      .replace(/&quot;/g, '"')  // Replace &quot; with "
      .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
      .trim();                  // Trim spaces
  }
}
