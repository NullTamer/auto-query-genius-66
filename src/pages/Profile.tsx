
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Search, UserCircle, Settings, LogOut, History, Copy, Check, Bookmark, ExternalLink, Building, MapPin, FileBadge, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import NavigationPane from "@/components/layout/NavigationPane";
import ProfileForm from "@/components/profile/ProfileForm";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      try {
        const { data: historyData, error: historyError } = await supabase
          .from('search_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (historyError) throw historyError;
        
        if (historyData && historyData.length > 0) {
          setSearchHistory(historyData);
        } else {
          setSearchHistory([
            { id: 1, query: "React developer", provider: "google", results_count: 42, created_at: "2023-05-15" },
            { id: 2, query: "JavaScript engineer", provider: "linkedin", results_count: 38, created_at: "2023-05-10" },
            { id: 3, query: "Full-stack developer", provider: "indeed", results_count: 56, created_at: "2023-05-05" },
            { id: 4, query: "Frontend specialist", provider: "google", results_count: 31, created_at: "2023-04-28" },
            { id: 5, query: "React Native developer", provider: "linkedin", results_count: 27, created_at: "2023-04-20" },
          ]);
        }

        const { data: jobsData, error: jobsError } = await supabase
          .from('job_postings')
          .select(`
            id, 
            title, 
            description, 
            posting_url, 
            created_at,
            job_sources (
              source_name
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (jobsError) throw jobsError;
        
        if (jobsData && jobsData.length > 0) {
          setSavedJobs(jobsData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
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

  const handleRemoveSavedJob = async (jobId: number) => {
    try {
      const { error } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', jobId);
        
      if (error) throw error;
      
      setSavedJobs(savedJobs.filter(job => job.id !== jobId));
      toast.success("Job removed from saved list");
    } catch (error) {
      console.error("Error removing saved job:", error);
      toast.error("Failed to remove saved job");
    }
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
                  onClick={() => navigate("/")}
                >
                  <Search className="mr-2 h-4 w-4" />
                  New Search
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="cyber-card"
                  onClick={() => navigate("/profile/resumes")}
                >
                  <FileBadge className="mr-2 h-4 w-4" />
                  My Resumes
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 cyber-card">
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              Search History
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Bookmark className="mr-2 h-4 w-4" />
              Saved Jobs
            </TabsTrigger>
            <TabsTrigger value="searches">
              <Search className="mr-2 h-4 w-4" />
              Saved Searches
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-4">
            <ProfileForm />
          </TabsContent>
          
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
            <Card className="cyber-card">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-4">
                  {savedJobs.length > 0 ? (
                    savedJobs.map((job) => (
                      <div 
                        key={job.id} 
                        className="p-3 border border-primary/20 rounded-md hover:border-primary/50 bg-background/50 transition-all relative"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-primary font-medium">{job.title}</h3>
                            {job.job_sources && (
                              <div className="flex items-center text-sm mt-1">
                                <Building size={14} className="mr-1" />
                                <span className="text-muted-foreground">
                                  Source: {job.job_sources.source_name}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveSavedJob(job.id)}
                              title="Remove from saved jobs"
                            >
                              <div className="sr-only">Remove job</div>
                              ✕
                            </Button>
                            {job.posting_url && (
                              <a
                                href={job.posting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary p-1 rounded transition-colors"
                                title="Open job posting"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-sm line-clamp-2 text-muted-foreground">
                          {job.description}
                        </p>
                        <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                          <div className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      <p>No saved jobs yet.</p>
                      <Button className="mt-4 cyber-card hover:neon-glow" onClick={() => navigate("/")}>
                        <Search className="mr-2 h-4 w-4" />
                        Find Jobs to Save
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
          
          <TabsContent value="searches" className="mt-4">
            <Card className="cyber-card p-6">
              <div className="text-center text-muted-foreground">
                <p>You don't have any saved searches yet.</p>
                <Button className="mt-4 cyber-card hover:neon-glow" onClick={() => navigate("/")}>
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
