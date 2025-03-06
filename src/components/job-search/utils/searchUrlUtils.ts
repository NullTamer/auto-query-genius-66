
import { SearchProvider } from "../types";

/**
 * Generates search URLs for different job board providers
 */
export const getSearchUrl = (provider: SearchProvider, searchQuery: string): string => {
  const encodedQuery = encodeURIComponent(searchQuery);
  
  switch (provider) {
    case "linkedin":
      return `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;
    case "indeed":
      return `https://www.indeed.com/jobs?q=${encodedQuery}`;
    case "google":
      return `https://www.google.com/search?q=${encodedQuery}+jobs`;
    case "arbeitnow":
      return `https://www.arbeitnow.com/jobs/${encodedQuery}`;
    case "jobdataapi":
      return `https://www.google.com/search?q=${encodedQuery}+jobs`;
    case "usajobs":
      return `https://www.usajobs.gov/Search/Results?k=${encodedQuery}`;
    case "remoteok":
      return `https://remoteok.com/remote-${encodedQuery.replace(/\s+/g, '-')}-jobs`;
    case "glassdoor":
      return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodedQuery}`;
    default:
      return `https://www.google.com/search?q=${encodedQuery}+jobs`;
  }
};

// Define job board regions for categorization
export const jobBoardRegions = {
  global: ["google", "linkedin"],
  usa: ["indeed", "usajobs", "glassdoor"],
  europe: ["arbeitnow"],
  remote: ["remoteok"],
  other: ["jobdataapi"]
};

/**
 * Returns a formatted display name for a provider
 */
export const getProviderDisplayName = (provider: string): string => {
  switch (provider) {
    case "google": return "Google";
    case "linkedin": return "LinkedIn";
    case "indeed": return "Indeed";
    case "usajobs": return "USA Jobs";
    case "glassdoor": return "Glassdoor";
    case "arbeitnow": return "ArbeitNow";
    case "remoteok": return "RemoteOK";
    case "jobdataapi": return "Job Data API";
    default: return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
};

/**
 * Returns a formatted display name for a region
 */
export const getRegionDisplayName = (region: string): string => {
  switch (region) {
    case "global": return "Worldwide";
    case "usa": return "United States";
    case "europe": return "Europe";
    case "remote": return "Remote Only";
    case "other": return "Other";
    default: return region.charAt(0).toUpperCase() + region.slice(1);
  }
};
