
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProfileData } from "@/hooks/useProfileData";
import PersonalInfoSection from "./PersonalInfoSection";
import ProfessionalInfoSection from "./ProfessionalInfoSection";
import BioSection from "./BioSection";

const ProfileForm: React.FC = () => {
  const { 
    profile, 
    isLoading, 
    isSaving, 
    handleChange, 
    handleSelectChange, 
    saveProfile 
  } = useProfileData();

  if (isLoading) {
    return (
      <Card className="cyber-card p-6 animate-fade-in">
        <div className="flex justify-center items-center h-40">
          <div className="loader"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="cyber-card p-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-primary mb-4">Profile Information</h2>
      
      <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PersonalInfoSection 
            profile={profile} 
            onChange={handleChange} 
          />
          
          <ProfessionalInfoSection 
            profile={profile} 
            onChange={handleChange} 
            onSelectChange={handleSelectChange} 
          />
        </div>
        
        <BioSection 
          profile={profile} 
          onChange={handleChange} 
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="cyber-card hover:neon-glow">
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ProfileForm;
