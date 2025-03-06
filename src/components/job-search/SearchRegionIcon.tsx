
import React from "react";
import { Globe, MapPin, Briefcase } from "lucide-react";

interface SearchRegionIconProps {
  region: string;
  className?: string;
}

const SearchRegionIcon: React.FC<SearchRegionIconProps> = ({ region, className = "mr-1" }) => {
  switch (region) {
    case "global":
      return <Globe size={14} className={className} />;
    case "usa":
    case "europe":
      return <MapPin size={14} className={className} />;
    case "remote":
      return <Briefcase size={14} className={className} />;
    default:
      return null;
  }
};

export default SearchRegionIcon;
