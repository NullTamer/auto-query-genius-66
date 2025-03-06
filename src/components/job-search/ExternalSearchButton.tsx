import React from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { JobBoardSelection, SearchProvider } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ExternalSearchButtonProps {
  searchTerm: string;
  query: string;
  searchProvider: SearchProvider;
  selectedBoards?: JobBoardSelection;
}

// Define job board regions for categorization
const jobBoardRegions = {
  global: ["google", "linkedin"],
  usa: ["indeed", "usajobs", "glassdoor"],
  europe: ["arbeitnow"],
  remote: ["remoteok"],
  other: ["jobdataapi"]
};

const ExternalSearchButton: React.FC<ExternalSearchButtonProps> = ({
  searchTerm,
  query,
  searchProvider,
  selectedBoards,
}) => {
  const getSearchUrl = (provider: SearchProvider) => {
    const searchQuery = encodeURIComponent(searchTerm || query);
    
    switch (provider) {
      case "linkedin":
        return `https://www.linkedin.com/jobs/search/?keywords=${searchQuery}`;
      case "indeed":
        return `https://www.indeed.com/jobs?q=${searchQuery}`;
      case "google":
        return `https://www.google.com/search?q=${searchQuery}+jobs`;
      case "arbeitnow":
        return `https://www.arbeitnow.com/jobs/${searchQuery}`;
      case "jobdataapi":
        return `https://www.google.com/search?q=${searchQuery}+jobs`;
      case "usajobs":
        return `https://www.usajobs.gov/Search/Results?k=${searchQuery}`;
      case "remoteok":
        return `https://remoteok.com/remote-${searchQuery.replace(/\s+/g, '-')}-jobs`;
      case "glassdoor":
        return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${searchQuery}`;
      default:
        return `https://www.google.com/search?q=${searchQuery}+jobs`;
    }
  };

  const openExternalSearch = () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    // Open in the currently selected provider
    window.open(getSearchUrl(searchProvider), "_blank");
  };

  const openAllJobBoards = () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    // Determine which providers to open based on selectedBoards
    const providers: SearchProvider[] = [];
    
    if (selectedBoards) {
      // Use selected boards if available
      if (selectedBoards.google) providers.push("google");
      if (selectedBoards.linkedin) providers.push("linkedin");
      if (selectedBoards.indeed) providers.push("indeed");
      if (selectedBoards.arbeitnow) providers.push("arbeitnow");
      if (selectedBoards.jobdataapi) providers.push("jobdataapi");
      if (selectedBoards.usajobs) providers.push("usajobs");
      if (selectedBoards.remoteok) providers.push("remoteok");
      if (selectedBoards.glassdoor) providers.push("glassdoor");
    } else {
      // Default to all providers if no selection
      providers.push("google", "linkedin", "indeed", "arbeitnow", "jobdataapi", "usajobs", "remoteok", "glassdoor");
    }
    
    // If no boards are selected, show error
    if (providers.length === 0) {
      toast.error("Please select at least one job board");
      return;
    }
    
    try {
      // Modified approach: Create a user-triggered action to open windows
      // This approach should work better with popup blockers
      const openUrls = (providerList: SearchProvider[]) => {
        providerList.forEach((provider) => {
          const url = getSearchUrl(provider);
          window.open(url, "_blank");
        });
        
        toast.success(`Opened search in ${providers.length} job board${providers.length > 1 ? 's' : ''}`);
      };
      
      // Execute immediately - browser popup blockers typically allow multiple windows 
      // if they're opened directly in response to a user action
      openUrls(providers);
    } catch (error) {
      console.error("Failed to open job boards:", error);
      toast.error("Failed to open job boards. Please check your popup blocker settings.");
    }
  };

  // Open job boards by region
  const openRegionalJobBoards = (region: keyof typeof jobBoardRegions) => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }

    const regionProviders = jobBoardRegions[region] as SearchProvider[];
    
    // Filter by selected boards if available
    const filteredProviders = selectedBoards 
      ? regionProviders.filter(provider => selectedBoards[provider as keyof JobBoardSelection])
      : regionProviders;
    
    if (filteredProviders.length === 0) {
      toast.error(`No job boards selected in the ${region} region`);
      return;
    }
    
    try {
      filteredProviders.forEach((provider) => {
        const url = getSearchUrl(provider as SearchProvider);
        window.open(url, "_blank");
      });
      
      toast.success(`Opened search in ${filteredProviders.length} ${region} job board${filteredProviders.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error(`Failed to open ${region} job boards:`, error);
      toast.error(`Failed to open ${region} job boards. Please check your popup blocker settings.`);
    }
  };

  // Get region names formatted for display
  const getRegionDisplayName = (region: keyof typeof jobBoardRegions): string => {
    switch (region) {
      case "global": return "Worldwide";
      case "usa": return "United States";
      case "europe": return "Europe";
      case "remote": return "Remote Only";
      case "other": return "Other";
      default: return region.charAt(0).toUpperCase() + region.slice(1);
    }
  };

  // Get provider display name
  const getProviderDisplayName = (provider: SearchProvider): string => {
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

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          onClick={openExternalSearch}
          variant="outline"
          className="cyber-card flex items-center gap-2 hover:neon-glow transition-all whitespace-nowrap"
          title={`Open in ${searchProvider}`}
        >
          <ExternalLink size={16} />
          External
        </Button>
        <Button
          onClick={openAllJobBoards}
          variant="outline"
          className="cyber-card flex items-center gap-2 hover:neon-glow transition-all whitespace-nowrap"
          title="Open in selected job boards"
        >
          <ExternalLink size={16} />
          {selectedBoards ? "Selected Boards" : "All Boards"}
        </Button>
      </div>
      
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid grid-cols-5 mb-2">
          {(Object.keys(jobBoardRegions) as Array<keyof typeof jobBoardRegions>).map((region) => (
            <TabsTrigger key={region} value={region} className="text-xs">
              {getRegionDisplayName(region)}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {(Object.entries(jobBoardRegions) as Array<[keyof typeof jobBoardRegions, Array<string>]>).map(([region, providers]) => (
          <TabsContent key={region} value={region} className="mt-0">
            <div className="flex flex-wrap gap-2">
              {providers.map((provider) => (
                <Button
                  key={provider}
                  onClick={() => window.open(getSearchUrl(provider as SearchProvider), "_blank")}
                  variant="outline"
                  size="sm"
                  disabled={selectedBoards && !selectedBoards[provider as keyof JobBoardSelection]}
                  className={`cyber-card hover:neon-glow transition-all whitespace-nowrap ${
                    provider === searchProvider ? "border-primary" : ""
                  }`}
                  title={`Open in ${getProviderDisplayName(provider as SearchProvider)}`}
                >
                  {getProviderDisplayName(provider as SearchProvider)}
                </Button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ExternalSearchButton;
