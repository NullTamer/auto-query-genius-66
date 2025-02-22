
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isProcessing?: boolean;
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  value,
  onChange,
  onSubmit,
  isProcessing = false
}) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onChange(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card className="p-6 backdrop-blur-lg bg-glass shadow-lg animate-fade-in">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-secondary">Job Description</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <Upload size={16} />
              Upload
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".txt,.doc,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your job description here..."
          className="min-h-[200px] resize-none"
        />
        <Button
          onClick={onSubmit}
          className="w-full bg-primary hover:bg-primary/90 text-white"
          disabled={!value.trim() || isProcessing}
        >
          Generate Boolean Query
        </Button>
      </div>
    </Card>
  );
};

export default JobDescriptionInput;
