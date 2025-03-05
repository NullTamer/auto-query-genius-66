
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
}
