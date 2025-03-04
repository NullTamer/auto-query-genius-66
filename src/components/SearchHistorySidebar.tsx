
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { Bookmark, Clock, Search, Trash, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchHistoryItem {
  id: number;
  query: string;
  created_at: string;
  is_saved: boolean;
  job_posting_id: number | null;
}

interface SearchHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
  currentQuery: string;
}

const SearchHistorySidebar = ({ isOpen, onClose, onSelectQuery, currentQuery }: SearchHistorySidebarProps) => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchSearchHistory();
    }
  }, [isOpen]);

  const fetchSearchHistory = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching search history:', error);
        toast.error('Failed to load search history');
        return;
      }

      setSearchHistory(data || []);
    } catch (error) {
      console.error('Error in fetchSearchHistory:', error);
      toast.error('Failed to load search history');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentQuery = async () => {
    if (!currentQuery.trim()) {
      toast.error('No query to save');
      return;
    }

    try {
      const { error } = await supabase
        .from('search_history')
        .insert({
          query: currentQuery,
          is_saved: true
        });

      if (error) {
        console.error('Error saving query:', error);
        toast.error('Failed to save query');
        return;
      }

      toast.success('Query saved successfully');
      fetchSearchHistory();
    } catch (error) {
      console.error('Error in saveCurrentQuery:', error);
      toast.error('Failed to save query');
    }
  };

  const toggleSaved = async (item: SearchHistoryItem) => {
    try {
      const { error } = await supabase
        .from('search_history')
        .update({ is_saved: !item.is_saved })
        .eq('id', item.id);

      if (error) {
        console.error('Error updating saved status:', error);
        toast.error('Failed to update saved status');
        return;
      }

      fetchSearchHistory();
    } catch (error) {
      console.error('Error in toggleSaved:', error);
      toast.error('Failed to update saved status');
    }
  };

  const deleteHistoryItem = async (id: number) => {
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting history item:', error);
        toast.error('Failed to delete history item');
        return;
      }

      setSearchHistory(searchHistory.filter(item => item.id !== id));
      toast.success('History item deleted');
    } catch (error) {
      console.error('Error in deleteHistoryItem:', error);
      toast.error('Failed to delete history item');
    }
  };

  const clearHistory = async () => {
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .is('is_saved', false);

      if (error) {
        console.error('Error clearing history:', error);
        toast.error('Failed to clear history');
        return;
      }

      fetchSearchHistory();
      toast.success('Search history cleared');
    } catch (error) {
      console.error('Error in clearHistory:', error);
      toast.error('Failed to clear history');
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-72 bg-background/95 backdrop-blur-sm border-l border-primary/20 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out z-50`}>
      <div className="h-full cyber-card flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-primary/20">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search History
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:text-primary-foreground">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-4 border-b border-primary/20">
          <Button
            onClick={saveCurrentQuery}
            className="w-full cyber-card flex items-center gap-2"
            disabled={!currentQuery.trim()}
          >
            <Bookmark className="h-4 w-4" />
            Save Current Query
          </Button>
        </div>
        
        <ScrollArea className="flex-1 px-4 py-2">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-pulse text-primary">Loading...</div>
            </div>
          ) : searchHistory.length > 0 ? (
            <div className="space-y-3">
              {searchHistory.map(item => (
                <div
                  key={item.id}
                  className="cyber-card p-3 border border-primary/20 rounded-md hover:border-primary/40 transition-all"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div 
                      className="line-clamp-2 cursor-pointer hover:text-primary transition-colors text-sm"
                      onClick={() => onSelectQuery(item.query)}
                    >
                      {item.query}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleSaved(item)}>
                        <Bookmark className="h-4 w-4" fill={item.is_saved ? "currentColor" : "none"} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteHistoryItem(item.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 text-muted-foreground">
              <p>No search history yet</p>
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t border-primary/20">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearHistory} 
            className="w-full cyber-card"
            disabled={!searchHistory.some(item => !item.is_saved)}
          >
            <Trash className="h-4 w-4 mr-2" />
            Clear Unsaved History
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchHistorySidebar;
