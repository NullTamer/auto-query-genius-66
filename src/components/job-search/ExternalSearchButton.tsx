import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, History, X } from "lucide-react";
import { toast } from "sonner";
import { SearchProvider } from "./types";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExternalSearchButtonProps {
  searchTerm: string;
  query: string;
  searchProvider: SearchProvider;
}

interface SearchHistoryItem {
  id: number;
  query: string;
  provider?: SearchProvider;
  created_at: string;
  results_count?: number;
}

const ExternalSearchButton: React.FC<ExternalSearchButtonProps> = ({
  searchTerm,
  query,
  searchProvider,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSearchUrl = (provider: SearchProvider) => {
    const searchQuery = encodeURIComponent(searchTerm || query);
    
    switch (provider) {
      case "linkedin":
        return `https://www.linkedin.com/jobs/search/?keywords=${searchQuery}`;
      case "indeed":
        return `https://www.indeed.com/jobs?q=${searchQuery}`;
      case "google":
        return `https://www.google.com/search?q=${searchQuery}+jobs+site:*.edu|site:*.org|site:*.gov+-inurl:(signup+|+login)`;
      default:
        return `https://www.google.com/search?q=${searchQuery}+jobs`;
    }
  };

  const openExternalSearch = () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    try {
      window.open(getSearchUrl(searchProvider), "_blank");
      toast.success(`Opened search on ${searchProvider}`);
    } catch (error) {
      console.error("Failed to open search:", error);
      toast.error("Failed to open search. Please check your popup blocker settings.");
    }
  };

  const openAllJobBoards = () => {
    if (!query && !searchTerm) {
      toast.error("Please generate a boolean query first or enter a search term");
      return;
    }
    
    const providers: SearchProvider[] = ["google", "linkedin", "indeed"];
    
    try {
      providers.forEach((provider, index) => {
        setTimeout(() => {
          try {
            const url = getSearchUrl(provider);
            console.log(`Opening ${provider} search at: ${url}`);
            window.open(url, `_blank_${provider}`);
          } catch (err) {
            console.error(`Failed to open ${provider}:`, err);
          }
        }, index * 300);
      });
      
      toast.success("Opened search in all job boards");
    } catch (error) {
      console.error("Failed to open job boards:", error);
      toast.error("Failed to open all job boards. Please check your popup blocker settings.");
    }
  };

  const fetchSearchHistory = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error("Please sign in to view your search history");
        return;
      }
      
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (error) throw error;
      
      setSearchHistory(data || []);
      setHistoryOpen(true);
    } catch (error) {
      console.error("Failed to fetch search history:", error);
      toast.error("Failed to load search history");
    } finally {
      setIsLoading(false);
    }
  };

  const runHistorySearch = (historyItem: SearchHistoryItem) => {
    if (!historyItem.query) return;
    
    try {
      window.open(getSearchUrl(historyItem.provider as SearchProvider || searchProvider), "_blank");
      toast.success(`Opened search: ${historyItem.query}`);
      setHistoryOpen(false);
    } catch (error) {
      console.error("Failed to run history search:", error);
      toast.error("Failed to open search");
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={openExternalSearch}
        variant="outline"
        className="cyber-card flex items-center gap-2 hover:neon-glow transition-all whitespace-nowrap"
        title={`Open in ${searchProvider}`}
      >
        <ExternalLink size={16} />
        External
      </Button>
      <Button
        onClick={openAllJobBoards}
        variant="outline"
        className="cyber-card flex items-center gap-2 hover:neon-glow transition-all whitespace-nowrap"
        title="Open in all job boards"
      >
        <ExternalLink size={16} />
        All Boards
      </Button>
      <Button
        onClick={fetchSearchHistory}
        variant="outline"
        className="cyber-card flex items-center gap-2 hover:neon-glow transition-all whitespace-nowrap"
        title="View search history"
        disabled={isLoading}
      >
        <History size={16} />
        {isLoading ? "Loading..." : "History"}
      </Button>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-md cyber-card">
          <DialogHeader>
            <DialogTitle className="text-primary neon-glow">Search History</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          
          {searchHistory.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <p>No search history found.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {searchHistory.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 border border-primary/20 rounded-md hover:border-primary/50 bg-background/50 transition-all cursor-pointer"
                    onClick={() => runHistorySearch(item)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-medium hover:underline">
                        {item.query}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                        {item.provider && ` - ${item.provider}`}
                      </span>
                    </div>
                    {item.results_count !== undefined && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Results: {item.results_count}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExternalSearchButton;
