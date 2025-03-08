
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileData } from "@/hooks/useProfileData";

interface ProfessionalInfoSectionProps {
  profile: ProfileData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

const ProfessionalInfoSection: React.FC<ProfessionalInfoSectionProps> = ({ 
  profile, 
  onChange, 
  onSelectChange 
}) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="job_title">Job Title</Label>
        <Input
          id="job_title"
          name="job_title"
          value={profile.job_title}
          onChange={onChange}
          placeholder="Your job title"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          name="company"
          value={profile.company}
          onChange={onChange}
          placeholder="Your company"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="experience_level">Experience Level</Label>
        <Select 
          value={profile.experience_level} 
          onValueChange={(value) => onSelectChange("experience_level", value)}
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
      
      <div className="space-y-2">
        <Label htmlFor="skills">Skills (comma separated)</Label>
        <Input
          id="skills"
          name="skills"
          value={profile.skills}
          onChange={onChange}
          placeholder="JavaScript, React, TypeScript, Node.js"
        />
      </div>
    </>
  );
};

export default ProfessionalInfoSection;
