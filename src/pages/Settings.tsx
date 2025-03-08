
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import NavigationPane from "@/components/layout/NavigationPane";
import { Settings as SettingsIcon, Bell, User, Shield, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toggleDarkMode } from "@/integrations/supabase/client";

const Settings = () => {
  const [darkMode, setDarkMode] = useState(true); // Default to true

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setDarkMode(isDarkMode);
  }, []);

  const handleToggleDarkMode = () => {
    const newDarkModeState = !darkMode;
    toggleDarkMode(newDarkModeState);
    setDarkMode(newDarkModeState);
    toast.success(`${newDarkModeState ? "Dark" : "Light"} mode enabled`);
  };

  return (
    <div className="min-h-screen matrix-bg p-4 md:p-8 font-mono">
      <NavigationPane />
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 ml-16">
        <Card className="cyber-card p-4 md:p-6 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
              <SettingsIcon className="inline mr-2 h-5 w-5" />
              Settings
            </h2>
          </div>
          
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="account" className="cyber-card data-[state=active]:bg-primary/20">
                <User className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger value="notifications" className="cyber-card data-[state=active]:bg-primary/20">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" className="cyber-card data-[state=active]:bg-primary/20">
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="data" className="cyber-card data-[state=active]:bg-primary/20">
                <Database className="h-4 w-4 mr-2" />
                Data
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="account" className="p-4">
              <h3 className="text-lg font-medium mb-4">Account Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="profile-visibility">Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">Make your profile visible to recruiters</p>
                  </div>
                  <Switch id="profile-visibility" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dark-mode">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Use dark mode for the application</p>
                  </div>
                  <Switch 
                    id="dark-mode" 
                    checked={darkMode}
                    onCheckedChange={handleToggleDarkMode}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="notifications" className="p-4">
              <h3 className="text-lg font-medium mb-4">Notification Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive job alerts via email</p>
                  </div>
                  <Switch id="email-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="browser-notifications">Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive browser notifications for new jobs</p>
                  </div>
                  <Switch id="browser-notifications" />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="privacy" className="p-4">
              <h3 className="text-lg font-medium mb-4">Privacy Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="data-collection">Data Collection</Label>
                    <p className="text-sm text-muted-foreground">Allow collection of usage data to improve services</p>
                  </div>
                  <Switch id="data-collection" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="third-party">Third-Party Sharing</Label>
                    <p className="text-sm text-muted-foreground">Share data with trusted partners</p>
                  </div>
                  <Switch id="third-party" />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="data" className="p-4">
              <h3 className="text-lg font-medium mb-4">Data Management</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="search-history">Save Search History</Label>
                    <p className="text-sm text-muted-foreground">Keep a record of your searches</p>
                  </div>
                  <Switch id="search-history" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-backup">Automatic Backup</Label>
                    <p className="text-sm text-muted-foreground">Back up your data automatically</p>
                  </div>
                  <Switch id="auto-backup" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
