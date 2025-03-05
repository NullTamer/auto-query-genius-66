
export type SearchProvider = "linkedin" | "indeed" | "google";

export interface SearchResult {
  title: string;
  company: string;
  url: string;
  snippet: string;
  location?: string;
  date?: string;
  source: string;
  id?: string;
  timestamp?: string;
  isReal?: boolean;
  salary?: string;
  jobType?: string;
}

export interface SearchMetadata {
  query: string;
  provider: string;
  timestamp: string;
  realResultsCount: number;
  fallbackResultsCount: number;
}
