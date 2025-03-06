
import React from 'react';
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchProvider, JobBoardSelection } from "./types";

interface SearchProviderContextType {
  searchProvider: SearchProvider;
  selectedBoards: JobBoardSelection;
  setSearchProvider: (provider: SearchProvider) => void;
  setSelectedBoards: (boards: JobBoardSelection) => void;
  handleProviderChange: (provider: SearchProvider) => void;
  handleBoardSelectionChange: (boards: JobBoardSelection) => void;
}

const SearchProviderContext = React.createContext<SearchProviderContextType | undefined>(undefined);

export const useSearchProvider = (): SearchProviderContextType => {
  const context = React.useContext(SearchProviderContext);
  if (!context) {
    throw new Error('useSearchProvider must be used within a SearchProviderProvider');
  }
  return context;
};

interface SearchProviderProviderProps {
  children: React.ReactNode;
  initialProvider?: SearchProvider;
}

export const SearchProviderProvider: React.FC<SearchProviderProviderProps> = ({ 
  children, 
  initialProvider 
}) => {
  const [searchProvider, setSearchProvider] = React.useState<SearchProvider>(initialProvider || "google");
  const [selectedBoards, setSelectedBoards] = React.useState<JobBoardSelection>({
    linkedin: false,
    indeed: false,
    google: true,
    arbeitnow: false,
    jobdataapi: false,
    usajobs: false,
    remoteok: false,
    glassdoor: false
  });
  const location = useLocation();
  const navigate = useNavigate();
  const isSearchPage = location.pathname === "/search";

  React.useEffect(() => {
    if (isSearchPage) {
      const searchParams = new URLSearchParams(location.search);
      const urlProvider = searchParams.get("provider") as SearchProvider | null;
      
      if (urlProvider && ["google", "linkedin", "indeed", "arbeitnow", "jobdataapi", "glassdoor", "usajobs", "remoteok"].includes(urlProvider)) {
        setSearchProvider(urlProvider);
        
        setSelectedBoards(prev => ({
          ...Object.keys(prev).reduce((acc, key) => ({
            ...acc,
            [key]: key === urlProvider
          }), {} as JobBoardSelection)
        }));
      }
    }
  }, [isSearchPage, location.search]);

  const handleProviderChange = (provider: SearchProvider) => {
    setSearchProvider(provider);
    
    setSelectedBoards(prev => ({
      ...prev,
      linkedin: provider === "linkedin",
      indeed: provider === "indeed",
      google: provider === "google",
      arbeitnow: provider === "arbeitnow",
      jobdataapi: provider === "jobdataapi",
      usajobs: provider === "usajobs",
      remoteok: provider === "remoteok",
      glassdoor: provider === "glassdoor"
    }));
    
    if (isSearchPage) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set("provider", provider);
      navigate(`/search?${searchParams.toString()}`, { replace: true });
    }
  };

  const handleBoardSelectionChange = (boards: JobBoardSelection) => {
    setSelectedBoards(boards);
    
    const selectedCount = Object.values(boards).filter(Boolean).length;
    
    if (selectedCount === 0) {
      setSelectedBoards(prev => ({...prev, google: true}));
    }
  };

  const value = {
    searchProvider,
    selectedBoards,
    setSearchProvider,
    setSelectedBoards,
    handleProviderChange,
    handleBoardSelectionChange
  };

  return (
    <SearchProviderContext.Provider value={value}>
      {children}
    </SearchProviderContext.Provider>
  );
};
