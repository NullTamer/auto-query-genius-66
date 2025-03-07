
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";
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
  const [showPopupWarning, setShowPopupWarning] = useState(false);
  const [activeRegion, setActiveRegion] = useState("global");

  const openExternalSearch = () => {
    if (!finalSearchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    // Open in the currently selected provider
    try {
      const newWindow = window.open(getSearchUrl(searchProvider, finalSearchTerm), "_blank");
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        setShowPopupWarning(true);
        toast.error("Popup blocked! Please enable popups for this site to open search results.");
      }
    } catch (error) {
      console.error("Failed to open search window:", error);
      toast.error("Failed to open search window. Please check your popup blocker settings.");
      setShowPopupWarning(true);
    }
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
      // Default to main providers if no selection
      providers.push("google", "linkedin", "indeed");
    }
    
    // If no boards are selected, show error
    if (providers.length === 0) {
      toast.error("Please select at least one job board");
      return;
    }
    
    // Open windows with staggered timing to avoid popup blockers
    const openWindowWithDelay = (index: number) => {
      if (index >= providers.length) return;
      
      const provider = providers[index];
      const url = getSearchUrl(provider, finalSearchTerm);
      
      try {
        const newWindow = window.open(url, "_blank");
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          setShowPopupWarning(true);
          toast.error("Popup blocked! Please enable popups for this site to open search results.");
          return; // Stop opening more if one is blocked
        }
        
        // Schedule the next window to open after a delay
        setTimeout(() => {
          openWindowWithDelay(index + 1);
        }, 300); // 300ms delay between each window
        
      } catch (error) {
        console.error(`Failed to open ${provider} window:`, error);
        setShowPopupWarning(true);
        toast.error("Failed to open job board windows. Please check your popup blocker settings.");
      }
    };
    
    // Start the staggered window opening process
    openWindowWithDelay(0);
    toast.success(`Opening search in ${providers.length} job board${providers.length > 1 ? 's' : ''}`);
  };

  // This function now only switches the active tab without performing a search
  const handleRegionTabChange = (region: string) => {
    setActiveRegion(region);
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
    
    // Open windows with staggered timing
    const openWindowWithDelay = (index: number) => {
      if (index >= filteredProviders.length) return;
      
      const provider = filteredProviders[index];
      const url = getSearchUrl(provider, finalSearchTerm);
      
      try {
        const newWindow = window.open(url, "_blank");
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          setShowPopupWarning(true);
          toast.error("Popup blocked! Please enable popups for this site to open search results.");
          return; // Stop opening more if one is blocked
        }
        
        // Schedule the next window to open after a delay
        setTimeout(() => {
          openWindowWithDelay(index + 1);
        }, 300); // 300ms delay between each window
        
      } catch (error) {
        console.error(`Failed to open ${provider} window:`, error);
        setShowPopupWarning(true);
        toast.error(`Failed to open ${region} job boards. Please check your popup blocker settings.`);
      }
    };
    
    // Start the staggered window opening process
    openWindowWithDelay(0);
    toast.success(`Opening search in ${filteredProviders.length} ${getRegionDisplayName(region)} job board${filteredProviders.length > 1 ? 's' : ''}`);
  };

  // Clear all selected boards in the current region
  const clearRegionSelections = () => {
    if (!selectedBoards) return;
    
    const regionProviders = jobBoardRegions[activeRegion as keyof typeof jobBoardRegions] || [];
    const updatedBoards = {...selectedBoards};
    
    regionProviders.forEach(provider => {
      updatedBoards[provider as keyof JobBoardSelection] = false;
    });
    
    toast.success(`Cleared all selections in ${getRegionDisplayName(activeRegion)}`);
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
      
      {showPopupWarning && (
        <div className="text-xs flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/50 rounded-md text-yellow-500">
          <AlertCircle size={14} />
          <span>Please enable popups in your browser to open multiple job boards at once.</span>
        </div>
      )}
      
      <Tabs defaultValue="global" className="w-full" value={activeRegion} onValueChange={handleRegionTabChange}>
        <RegionTabs 
          onRegionClick={handleRegionTabChange}
          onRegionDoubleClick={toggleRegionBoards}
          activeRegion={activeRegion}
          onClearRegion={clearRegionSelections}
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
