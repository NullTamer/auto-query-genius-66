
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Home, Search, User, Settings, FileBadge, Menu, X } from "lucide-react";

const NavigationPane: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { name: "Home", icon: Home, path: "/" },
    { name: "Search", icon: Search, path: "/" },
    { name: "Profile", icon: User, path: "/auth" },
    { name: "Resume", icon: FileBadge, path: "/" },
    { name: "Settings", icon: Settings, path: "/" },
  ];

  return (
    <div
      className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 ${
        isExpanded ? "w-60" : "w-16"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="h-full cyber-card bg-background/80 backdrop-blur-sm shadow-lg flex flex-col py-4">
        <div className="flex items-center px-4 mb-6">
          {isExpanded ? (
            <>
              <X 
                className="mr-3 h-5 w-5 text-primary cursor-pointer" 
                onClick={() => setIsExpanded(false)}
              />
              <span className="font-bold text-primary text-lg neon-glow">AutoSearchPro</span>
            </>
          ) : (
            <Menu className="mx-auto h-6 w-6 text-primary cursor-pointer" />
          )}
        </div>
        
        <nav className="flex-1">
          <ul className="space-y-2 px-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center py-2 px-3 rounded-md hover:bg-primary/20 transition-colors ${
                    isExpanded ? "justify-start" : "justify-center"
                  }`}
                >
                  <item.icon className={`h-5 w-5 text-primary ${isExpanded ? "mr-3" : ""}`} />
                  {isExpanded && <span className="text-primary">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="mt-auto px-4">
          {isExpanded && (
            <div className="text-xs text-primary/70 data-stream">
              Version 1.0.0
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationPane;
