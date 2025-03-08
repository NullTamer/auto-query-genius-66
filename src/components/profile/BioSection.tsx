
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProfileData } from "@/hooks/useProfileData";

interface BioSectionProps {
  profile: ProfileData;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const BioSection: React.FC<BioSectionProps> = ({ profile, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="bio">Bio</Label>
      <Textarea
        id="bio"
        name="bio"
        value={profile.bio}
        onChange={onChange}
        placeholder="Write a short bio about yourself"
        rows={4}
      />
    </div>
  );
};

export default BioSection;
