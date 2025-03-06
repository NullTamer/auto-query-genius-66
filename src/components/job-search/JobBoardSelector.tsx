
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { JobBoardSelection, SearchProvider } from "./types";

interface JobBoardSelectorProps {
  selectedBoards: JobBoardSelection;
  onBoardSelectionChange: (boards: JobBoardSelection) => void;
  currentProvider: SearchProvider;
  onProviderChange: (provider: SearchProvider) => void;
}

const JobBoardSelector: React.FC<JobBoardSelectorProps> = ({
  selectedBoards,
  onBoardSelectionChange,
  currentProvider,
  onProviderChange,
}) => {
  const toggleBoard = (board: keyof JobBoardSelection) => {
    const newSelection = {
      ...selectedBoards,
      [board]: !selectedBoards[board],
    };
    
    onBoardSelectionChange(newSelection);
    
    // If this is the only selected board, make it the current provider
    const selectedCount = Object.values(newSelection).filter(Boolean).length;
    if (selectedCount === 1 && newSelection[board]) {
      onProviderChange(board as SearchProvider);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium mb-2">Search on multiple job boards:</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="linkedin" 
            checked={selectedBoards.linkedin}
            onCheckedChange={() => toggleBoard("linkedin")}
            className="cyber-card"
          />
          <Label htmlFor="linkedin" className="cursor-pointer">LinkedIn</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="indeed" 
            checked={selectedBoards.indeed}
            onCheckedChange={() => toggleBoard("indeed")}
            className="cyber-card"
          />
          <Label htmlFor="indeed" className="cursor-pointer">Indeed</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="google" 
            checked={selectedBoards.google}
            onCheckedChange={() => toggleBoard("google")}
            className="cyber-card"
          />
          <Label htmlFor="google" className="cursor-pointer">Google</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="arbeitnow" 
            checked={selectedBoards.arbeitnow}
            onCheckedChange={() => toggleBoard("arbeitnow")}
            className="cyber-card"
          />
          <Label htmlFor="arbeitnow" className="cursor-pointer">Arbeitnow</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="jobdataapi" 
            checked={selectedBoards.jobdataapi}
            onCheckedChange={() => toggleBoard("jobdataapi")}
            className="cyber-card"
          />
          <Label htmlFor="jobdataapi" className="cursor-pointer">JobDataAPI</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="usajobs" 
            checked={selectedBoards.usajobs}
            onCheckedChange={() => toggleBoard("usajobs")}
            className="cyber-card"
          />
          <Label htmlFor="usajobs" className="cursor-pointer">USAJobs</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="remoteok" 
            checked={selectedBoards.remoteok}
            onCheckedChange={() => toggleBoard("remoteok")}
            className="cyber-card"
          />
          <Label htmlFor="remoteok" className="cursor-pointer">RemoteOK</Label>
        </div>
      </div>
    </div>
  );
};

export default JobBoardSelector;
