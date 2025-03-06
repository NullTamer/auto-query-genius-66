
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchProvider } from "./types";
import { Card } from "@/components/ui/card";

interface ProviderToggleProps {
  searchProvider: SearchProvider;
  onProviderChange: (value: SearchProvider) => void;
}

const ProviderToggle: React.FC<ProviderToggleProps> = ({
  searchProvider,
  onProviderChange,
}) => {
  // Group providers by category
  const providerGroups = [
    { label: "Popular", providers: ["google", "linkedin", "indeed"] },
    { label: "Regional", providers: ["arbeitnow", "usajobs", "glassdoor"] },
    { label: "Specialty", providers: ["remoteok", "jobdataapi"] }
  ];

  return (
    <Card className="cyber-card p-4 bg-secondary/40">
      <div className="text-sm font-medium mb-3">Primary search provider:</div>
      <div className="space-y-3">
        {providerGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <h4 className="text-xs uppercase text-muted-foreground">{group.label}</h4>
            <ToggleGroup
              type="single"
              value={searchProvider}
              onValueChange={(value) => {
                if (value) onProviderChange(value as SearchProvider);
              }}
              className="flex flex-wrap gap-2"
            >
              {group.providers.map((provider) => (
                <ToggleGroupItem 
                  key={provider}
                  value={provider} 
                  className="cyber-card text-sm capitalize"
                  data-state={searchProvider === provider ? "on" : "off"}
                >
                  {provider}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ProviderToggle;
