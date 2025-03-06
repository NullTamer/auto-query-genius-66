
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchProvider } from "./types";

interface ProviderToggleProps {
  searchProvider: SearchProvider;
  onProviderChange: (value: SearchProvider) => void;
}

const ProviderToggle: React.FC<ProviderToggleProps> = ({
  searchProvider,
  onProviderChange,
}) => {
  return (
    <ToggleGroup
      type="single"
      value={searchProvider}
      onValueChange={(value) => {
        if (value) onProviderChange(value as SearchProvider);
      }}
      className="flex flex-wrap gap-2 mb-4"
    >
      <ToggleGroupItem value="google" className="cyber-card">
        Google
      </ToggleGroupItem>
      <ToggleGroupItem value="linkedin" className="cyber-card">
        LinkedIn
      </ToggleGroupItem>
      <ToggleGroupItem value="indeed" className="cyber-card">
        Indeed
      </ToggleGroupItem>
      <ToggleGroupItem value="arbeitnow" className="cyber-card">
        Arbeitnow
      </ToggleGroupItem>
      <ToggleGroupItem value="jobdataapi" className="cyber-card">
        JobDataAPI
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ProviderToggle;
