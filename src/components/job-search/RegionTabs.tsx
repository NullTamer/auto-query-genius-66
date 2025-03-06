
import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import SearchRegionIcon from "./SearchRegionIcon";
import { jobBoardRegions, getRegionDisplayName } from "./utils/searchUrlUtils";

interface RegionTabsProps {
  onRegionClick: (region: string) => void;
  onRegionDoubleClick: (region: string) => void;
}

const RegionTabs: React.FC<RegionTabsProps> = ({
  onRegionClick,
  onRegionDoubleClick
}) => {
  return (
    <TabsList className="grid grid-cols-5 mb-4">
      {Object.keys(jobBoardRegions).map((region) => (
        <TabsTrigger 
          key={region} 
          value={region} 
          className="text-xs flex items-center justify-center"
          onClick={() => onRegionClick(region)}
          onDoubleClick={() => onRegionDoubleClick(region)}
          title={`Click to search in ${getRegionDisplayName(region)} boards. Double click to toggle all boards in this region.`}
        >
          <SearchRegionIcon region={region} />
          {getRegionDisplayName(region)}
        </TabsTrigger>
      ))}
    </TabsList>
  );
};

export default RegionTabs;
