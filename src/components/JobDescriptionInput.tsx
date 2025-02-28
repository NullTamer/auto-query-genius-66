
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Terminal, Upload } from "lucide-react";

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
    <Card className="cyber-card p-4 md:p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
            <Terminal className="inline mr-2 h-5 w-5" />
            Job Description
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
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
          className="min-h-[200px] resize-none bg-background/50 border-primary/20 focus:border-primary/50 transition-all"
        />
        <Button
          onClick={onSubmit}
          className="w-full cyber-card bg-primary/20 hover:bg-primary/30 text-primary hover:text-primary-foreground hover:neon-glow transition-all"
          disabled={!value.trim() || isProcessing}
        >
          Generate Boolean Query
        </Button>
      </div>
    </Card>
  );
};

export default JobDescriptionInput;
