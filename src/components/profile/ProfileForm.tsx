
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  full_name: string;
  bio: string;
  job_title: string;
  company: string;
  location: string;
  website: string;
  skills: string;
  experience_level: string;
  phone: string;
}

const ProfileForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    bio: "",
    job_title: "",
    company: "",
    location: "",
    website: "",
    skills: "",
    experience_level: "mid",
    phone: ""
  });

  // Load profile data when component mounts
  useEffect(() => {
    const getProfileData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }
        
        if (data) {
          setProfile({
            full_name: data.full_name || "",
            bio: data.bio || "",
            job_title: data.job_title || "",
            company: data.company || "",
            location: data.location || "",
            website: data.website || "",
            skills: data.skills || "",
            experience_level: data.experience_level || "mid",
            phone: data.phone || ""
          });
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
      }
    };
    
    getProfileData();
  }, []);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Save profile data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to save your profile");
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          ...profile,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      toast.success("Profile saved successfully");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="cyber-card p-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-primary mb-4">Profile Information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              value={profile.full_name}
              onChange={handleChange}
              placeholder="Your full name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              name="job_title"
              value={profile.job_title}
              onChange={handleChange}
              placeholder="Your job title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              value={profile.company}
              onChange={handleChange}
              placeholder="Your company"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={profile.location}
              onChange={handleChange}
              placeholder="Your location"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              placeholder="Your phone number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              value={profile.website}
              onChange={handleChange}
              placeholder="Your personal website URL"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="experience_level">Experience Level</Label>
            <Select 
              value={profile.experience_level} 
              onValueChange={(value) => handleSelectChange("experience_level", value)}
            >
              <SelectTrigger id="experience_level">
                <SelectValue placeholder="Select your experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Level</SelectItem>
                <SelectItem value="mid">Mid Level</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
                <SelectItem value="lead">Lead/Manager</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="skills">Skills (comma separated)</Label>
          <Input
            id="skills"
            name="skills"
            value={profile.skills}
            onChange={handleChange}
            placeholder="JavaScript, React, TypeScript, Node.js"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            placeholder="Write a short bio about yourself"
            rows={4}
          />
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="cyber-card hover:neon-glow">
            {isLoading ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ProfileForm;
