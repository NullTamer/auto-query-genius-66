
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileData {
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

const defaultProfile: ProfileData = {
  full_name: "",
  bio: "",
  job_title: "",
  company: "",
  location: "",
  website: "",
  skills: "",
  experience_level: "mid",
  phone: ""
};

export function useProfileData() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);

  // Load profile data when component mounts
  useEffect(() => {
    const getProfileData = async () => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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
  const saveProfile = async () => {
    setIsSaving(true);
    
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
      setIsSaving(false);
    }
  };

  return {
    profile,
    isLoading,
    isSaving,
    handleChange,
    handleSelectChange,
    saveProfile
  };
}
