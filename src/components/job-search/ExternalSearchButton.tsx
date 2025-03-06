
import React from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { JobBoardSelection, SearchProvider } from "./types";
import { Tabs } from "@/components/ui/tabs";
import RegionTabs from "./RegionTabs";
import RegionTabContent from "./RegionTabContent";
import { jobBoardRegions, getRegionDisplayName, getSearchUrl } from "./utils/searchUrlUtils";

interface ExternalSearchButtonProps {
  searchTerm: string;
  query: string;
  searchProvider: SearchProvider;
  selectedBoards?: JobBoardSelection;
}

const ExternalSearchButton: React.FC<ExternalSearchButtonProps> = ({
  searchTerm,
  query,
  searchProvider,
  selectedBoards,
}) => {
  const finalSearchTerm = searchTerm || query;

  const openExternalSearch = () => {
    if (!finalSearchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    // Open in the currently selected provider
    window.open(getSearchUrl(searchProvider, finalSearchTerm), "_blank");
  };

  const openAllJobBoards = () => {
    if (!finalSearchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    // Determine which providers to open based on selectedBoards
    const providers: SearchProvider[] = [];
    
    if (selectedBoards) {
      // Use selected boards if available
      Object.entries(selectedBoards).forEach(([provider, isSelected]) => {
        if (isSelected) providers.push(provider as SearchProvider);
      });
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
      // Create a user-triggered action to open windows
      providers.forEach((provider) => {
        const url = getSearchUrl(provider, finalSearchTerm);
        window.open(url, "_blank");
      });
      
      toast.success(`Opened search in ${providers.length} job board${providers.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error("Failed to open job boards:", error);
      toast.error("Failed to open job boards. Please check your popup blocker settings.");
    }
  };

  // Toggle all job boards in a region
  const toggleRegionBoards = (region: string) => {
    if (!selectedBoards) return;
    
    const regionProviders = jobBoardRegions[region as keyof typeof jobBoardRegions] || [];
    const isAnySelected = regionProviders.some(provider => 
      selectedBoards[provider as keyof JobBoardSelection]
    );
    
    // If any are selected, deselect all; otherwise, select all
    const updatedBoards = {...selectedBoards};
    
    regionProviders.forEach(provider => {
      updatedBoards[provider as keyof JobBoardSelection] = !isAnySelected;
    });
    
    toast.success(`${!isAnySelected ? "Selected" : "Deselected"} all boards in ${getRegionDisplayName(region)}`);
  };

  // Open job boards by region
  const openRegionalJobBoards = (region: string) => {
    if (!finalSearchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }

    const regionProviders = jobBoardRegions[region as keyof typeof jobBoardRegions] as SearchProvider[];
    
    // Filter by selected boards if available
    const filteredProviders = selectedBoards 
      ? regionProviders.filter(provider => selectedBoards[provider as keyof JobBoardSelection])
      : regionProviders;
    
    if (filteredProviders.length === 0) {
      toast.error(`No job boards selected in the ${getRegionDisplayName(region)} region`);
      return;
    }
    
    try {
      filteredProviders.forEach((provider) => {
        const url = getSearchUrl(provider, finalSearchTerm);
        window.open(url, "_blank");
      });
      
      toast.success(`Opened search in ${filteredProviders.length} ${getRegionDisplayName(region)} job board${filteredProviders.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error(`Failed to open ${region} job boards:`, error);
      toast.error(`Failed to open ${region} job boards. Please check your popup blocker settings.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={openExternalSearch}
          variant="outline"
          className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
          title={`Open in ${searchProvider}`}
        >
          <ExternalLink size={16} />
          External Search
        </Button>
        <Button
          onClick={openAllJobBoards}
          variant="outline"
          className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
          title="Open in selected job boards"
        >
          <ExternalLink size={16} />
          {selectedBoards ? "Open Selected" : "All Boards"}
        </Button>
      </div>
      
      <Tabs defaultValue="global" className="w-full">
        <RegionTabs 
          onRegionClick={openRegionalJobBoards}
          onRegionDoubleClick={toggleRegionBoards}
        />
        
        {Object.entries(jobBoardRegions).map(([region, providers]) => (
          <RegionTabContent
            key={region}
            region={region}
            providers={providers}
            searchTerm={finalSearchTerm}
            currentProvider={searchProvider}
            selectedBoards={selectedBoards}
          />
        ))}
      </Tabs>
    </div>
  );
};

export default ExternalSearchButton;
