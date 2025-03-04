
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Search, UserCircle, Settings, LogOut, History, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import NavigationPane from "@/components/layout/NavigationPane";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const navigate = useNavigate();

  // Fetch user data and search history
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      // Fetch real search history if logged in
      try {
        const { data, error } = await supabase
          .from('search_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setSearchHistory(data);
        } else {
          // Fallback to mock data if no history exists
          setSearchHistory([
            { id: 1, query: "React developer", provider: "google", results_count: 42, created_at: "2023-05-15" },
            { id: 2, query: "JavaScript engineer", provider: "linkedin", results_count: 38, created_at: "2023-05-10" },
            { id: 3, query: "Full-stack developer", provider: "indeed", results_count: 56, created_at: "2023-05-05" },
            { id: 4, query: "Frontend specialist", provider: "google", results_count: 31, created_at: "2023-04-28" },
            { id: 5, query: "React Native developer", provider: "linkedin", results_count: 27, created_at: "2023-04-20" },
          ]);
        }
      } catch (error) {
        console.error("Error fetching search history:", error);
        // Use mock data on error
        setSearchHistory([
          { id: 1, query: "React developer", provider: "google", results_count: 42, created_at: "2023-05-15" },
          { id: 2, query: "JavaScript engineer", provider: "linkedin", results_count: 38, created_at: "2023-05-10" },
          { id: 3, query: "Full-stack developer", provider: "indeed", results_count: 56, created_at: "2023-05-05" },
          { id: 4, query: "Frontend specialist", provider: "google", results_count: 31, created_at: "2023-04-28" },
          { id: 5, query: "React Native developer", provider: "linkedin", results_count: 27, created_at: "2023-04-20" },
        ]);
      }
      
      setIsLoading(false);
    };
    
    getUser();
  }, [navigate]);

  // Reset copied state after timeout
  useEffect(() => {
    if (copiedId !== null) {
      const timer = setTimeout(() => {
        setCopiedId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Successfully signed out");
  };

  const runSearch = (query: string, provider: string = "google") => {
    toast.info(`Searching for: ${query}`);
    navigate(`/search?q=${encodeURIComponent(query)}&provider=${provider}`);
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Query copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <NavigationPane />
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 ml-16">
        <Card className="cyber-card p-6 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <Avatar className="h-24 w-24 border-4 border-primary/50">
              <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${user?.email}`} />
              <AvatarFallback>
                <UserCircle className="h-20 w-20" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary neon-glow text-center md:text-left">
                {user?.email}
              </h1>
              <p className="text-muted-foreground text-center md:text-left">
                Member since {new Date(user?.created_at).toLocaleDateString()}
              </p>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="cyber-card"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="cyber-card"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="cyber-card"
                  onClick={() => navigate("/search")}
                >
                  <Search className="mr-2 h-4 w-4" />
                  New Search
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2 cyber-card">
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              Search History
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Search className="mr-2 h-4 w-4" />
              Saved Searches
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="mt-4">
            <Card className="cyber-card">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-4">
                  {searchHistory.length > 0 ? (
                    searchHistory.map((item) => (
                      <div 
                        key={item.id} 
                        className="p-3 border border-primary/20 rounded-md hover:border-primary/50 bg-background/50 transition-all relative"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center cursor-pointer" onClick={() => runSearch(item.query, item.provider)}>
                            <span className="text-primary font-medium hover:underline">
                              {item.query}
                            </span>
                            <span className="ml-2 text-sm text-muted-foreground">
                              ({item.results_count || 0} results)
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            {typeof item.created_at === 'string' 
                              ? item.created_at 
                              : new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                          <span>Provider: {item.provider || "google"}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-muted-foreground hover:text-primary"
                            onClick={() => copyToClipboard(item.query, item.id)}
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {copiedId === item.id ? "Copied" : "Copy"}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      <p>No search history yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
          
          <TabsContent value="saved" className="mt-4">
            <Card className="cyber-card p-6">
              <div className="text-center text-muted-foreground">
                <p>You don't have any saved searches yet.</p>
                <Button className="mt-4 cyber-card hover:neon-glow" onClick={() => navigate("/search")}>
                  <Search className="mr-2 h-4 w-4" />
                  Start a New Search
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
