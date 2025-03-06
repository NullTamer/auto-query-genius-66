
import React from "react";
import { JobBoardSelection, SearchProvider } from "./types";
import JobBoardCheckbox from "./JobBoardCheckbox";

interface JobBoardGroupProps {
  groupName: string;
  boards: string[];
  selectedBoards: JobBoardSelection;
  currentProvider: SearchProvider;
  onToggleBoard: (board: keyof JobBoardSelection) => void;
}

const JobBoardGroup: React.FC<JobBoardGroupProps> = ({
  groupName,
  boards,
  selectedBoards,
  currentProvider,
  onToggleBoard,
}) => {
  return (
    <div className="mb-4">
      <h4 className="text-xs uppercase text-muted-foreground mb-2">{groupName}</h4>
      <div className="grid grid-cols-2 gap-3">
        {boards.map(board => (
          <JobBoardCheckbox
            key={board}
            board={board}
            isSelected={selectedBoards[board as keyof JobBoardSelection]}
            isCurrentProvider={currentProvider === board}
            onToggle={onToggleBoard}
          />
        ))}
      </div>
    </div>
  );
};

export default JobBoardGroup;
