
import React from "react";
import { Card } from "@/components/ui/card";
import { JobBoardSelection, SearchProvider } from "./types";
import JobBoardGroup from "./JobBoardGroup";
import { boardGroups } from "./utils/boardGroupsConfig";

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
    <Card className="cyber-card p-4 bg-secondary/40">
      <div className="text-sm font-medium mb-3">Select job boards to include in search:</div>
      
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
