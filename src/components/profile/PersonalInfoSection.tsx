
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileData } from "@/hooks/useProfileData";

interface PersonalInfoSectionProps {
  profile: ProfileData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({ profile, onChange }) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name</Label>
        <Input
          id="full_name"
          name="full_name"
          value={profile.full_name}
          onChange={onChange}
          placeholder="Your full name"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          name="phone"
          value={profile.phone}
          onChange={onChange}
          placeholder="Your phone number"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          value={profile.location}
          onChange={onChange}
          placeholder="Your location"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          value={profile.website}
          onChange={onChange}
          placeholder="Your personal website URL"
        />
      </div>
    </>
  );
};

export default PersonalInfoSection;
