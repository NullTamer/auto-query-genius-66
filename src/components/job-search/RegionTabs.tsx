
import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import SearchRegionIcon from "./SearchRegionIcon";
import { jobBoardRegions, getRegionDisplayName } from "./utils/searchUrlUtils";

interface RegionTabsProps {
  onRegionClick: (region: string) => void;
  onRegionDoubleClick: (region: string) => void;
  activeRegion: string;
}

const RegionTabs: React.FC<RegionTabsProps> = ({
  onRegionClick,
  onRegionDoubleClick,
  activeRegion
}) => {
  // Prevent default behavior for click to avoid search trigger
  const handleRegionClick = (e: React.MouseEvent, region: string) => {
    e.preventDefault();
    e.stopPropagation();
    onRegionClick(region);
  };
  
  const handleRegionDoubleClick = (e: React.MouseEvent, region: string) => {
    e.preventDefault();
    e.stopPropagation();
    onRegionDoubleClick(region);
  };

  return (
    <TabsList className="grid grid-cols-5 mb-2">
      {Object.keys(jobBoardRegions).map((region) => (
        <TabsTrigger 
          key={region} 
          value={region} 
          className="text-xs flex items-center justify-center"
          onClick={(e) => handleRegionClick(e, region)}
          onDoubleClick={(e) => handleRegionDoubleClick(e, region)}
          title={`Click to select ${getRegionDisplayName(region)} tab. Double click to toggle all boards in this region.`}
        >
          <SearchRegionIcon region={region} />
          {getRegionDisplayName(region)}
        </TabsTrigger>
      ))}
    </TabsList>
  );
};

export default RegionTabs;
