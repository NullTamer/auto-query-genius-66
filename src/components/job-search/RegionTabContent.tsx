
import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import JobBoardButton from "./JobBoardButton";
import { JobBoardSelection, SearchProvider } from "./types";

interface RegionTabContentProps {
  region: string;
  providers: string[];
  searchTerm: string;
  currentProvider: SearchProvider;
  selectedBoards?: JobBoardSelection;
}

const RegionTabContent: React.FC<RegionTabContentProps> = ({
  region,
  providers,
  searchTerm,
  currentProvider,
  selectedBoards
}) => {
  return (
    <TabsContent key={region} value={region} className="mt-0 space-y-2">
      <div className="flex flex-wrap gap-2">
        {providers.map((provider) => (
          <JobBoardButton 
            key={provider}
            provider={provider}
            searchTerm={searchTerm}
            currentProvider={currentProvider}
            isDisabled={selectedBoards && !selectedBoards[provider as keyof JobBoardSelection]}
          />
        ))}
      </div>
    </TabsContent>
  );
};

export default RegionTabContent;
