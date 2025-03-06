
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { JobBoardSelection, SearchProvider } from "./types";

interface JobBoardCheckboxProps {
  board: string;
  isSelected: boolean;
  isCurrentProvider: boolean;
  onToggle: (board: keyof JobBoardSelection) => void;
}

const JobBoardCheckbox: React.FC<JobBoardCheckboxProps> = ({
  board,
  isSelected,
  isCurrentProvider,
  onToggle,
}) => {
  const displayName = board.charAt(0).toUpperCase() + board.slice(1);
  
  return (
    <div className="flex items-center space-x-2">
      <Checkbox 
        id={`board-${board}`} 
        checked={isSelected}
        onCheckedChange={() => onToggle(board as keyof JobBoardSelection)}
        className="cyber-card data-[state=checked]:bg-primary"
      />
      <Label 
        htmlFor={`board-${board}`} 
        className={`cursor-pointer ${isCurrentProvider ? "text-primary font-medium" : ""}`}
      >
        {displayName}
      </Label>
    </div>
  );
};

export default JobBoardCheckbox;
