
import React from "react";
import { Card } from "@/components/ui/card";
import { JobBoardSelection, SearchProvider } from "./types";
import JobBoardGroup from "./JobBoardGroup";
import { boardGroups } from "./utils/boardGroupsConfig";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

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
  
  const clearSelections = () => {
    // Reset all boards to false except for Google
    const newSelection = {
      ...Object.keys(selectedBoards).reduce((acc, key) => ({
        ...acc,
        [key]: key === "google"
      }), {} as JobBoardSelection)
    };
    
    onBoardSelectionChange(newSelection);
    onProviderChange("google" as SearchProvider);
    toast.success("Cleared selections, reset to Google");
  };

  return (
    <Card className="cyber-card p-4 bg-secondary/40">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-medium">Select job boards to include in search:</div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={clearSelections}
        >
          <X className="mr-1 h-3 w-3" /> Clear
        </Button>
      </div>
      
      {Object.entries(boardGroups).map(([groupName, boards]) => (
        <JobBoardGroup
          key={groupName}
          groupName={groupName}
          boards={boards}
          selectedBoards={selectedBoards}
          currentProvider={currentProvider}
          onToggleBoard={toggleBoard}
        />
      ))}
    </Card>
  );
};

export default JobBoardSelector;
