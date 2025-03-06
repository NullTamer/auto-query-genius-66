
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { JobBoardSelection, SearchProvider } from "./types";
import { Card } from "@/components/ui/card";

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

  // Group job boards by category
  const boardGroups = {
    "Global": ["google", "linkedin"],
    "Regional": ["indeed", "usajobs", "glassdoor", "arbeitnow"],
    "Specialty": ["remoteok", "jobdataapi"]
  };

  return (
    <Card className="cyber-card p-4 bg-secondary/40">
      <div className="text-sm font-medium mb-3">Select job boards to include in search:</div>
      
      {Object.entries(boardGroups).map(([groupName, boards]) => (
        <div key={groupName} className="mb-4">
          <h4 className="text-xs uppercase text-muted-foreground mb-2">{groupName}</h4>
          <div className="grid grid-cols-2 gap-3">
            {boards.map(board => (
              <div key={board} className="flex items-center space-x-2">
                <Checkbox 
                  id={`board-${board}`} 
                  checked={selectedBoards[board as keyof JobBoardSelection]}
                  onCheckedChange={() => toggleBoard(board as keyof JobBoardSelection)}
                  className="cyber-card data-[state=checked]:bg-primary"
                />
                <Label 
                  htmlFor={`board-${board}`} 
                  className={`cursor-pointer ${currentProvider === board ? "text-primary font-medium" : ""}`}
                >
                  {board.charAt(0).toUpperCase() + board.slice(1)}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
};

export default JobBoardSelector;
