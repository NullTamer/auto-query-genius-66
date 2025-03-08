
import React from "react";
import { Card } from "@/components/ui/card";
import { ArrowRight, FileText, Search, Zap, Settings, HelpCircle } from "lucide-react";

const UserGuide = () => {
  return (
    <Card className="cyber-card p-4 md:p-6 animate-fade-in">
      <h2 className="text-xl md:text-2xl font-semibold text-primary mb-4 neon-glow">
        How to Use AutoSearchPro
      </h2>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="cyber-card p-4 flex items-start gap-3 data-stream"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="bg-primary/20 p-2 rounded-full">
                {step.icon}
              </div>
              <div>
                <h3 className="font-semibold text-primary mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {step.note && (
                  <p className="text-xs text-primary/70 mt-2 italic">{step.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center text-muted-foreground text-sm">
          <p>Need more help? Visit the <a href="/help" className="text-primary hover:underline">Help Center</a> for detailed instructions.</p>
        </div>
      </div>
    </Card>
  );
};

const steps = [
  {
    icon: <FileText className="h-5 w-5 text-primary" />,
    title: "Step 1: Enter Job Description",
    description: "Paste a job description in the input area or upload a PDF.",
    note: "The more detailed the job description, the better the results."
  },
  {
    icon: <Zap className="h-5 w-5 text-primary" />,
    title: "Step 2: Generate Query",
    description: "Click 'Generate Query' to extract important keywords from the job description.",
    note: "Keywords are automatically ranked by relevance."
  },
  {
    icon: <Search className="h-5 w-5 text-primary" />,
    title: "Step 3: Search Jobs",
    description: "The Boolean search query is created automatically. Use it to search for matching jobs.",
    note: "You can edit keywords to refine your search."
  },
  {
    icon: <Settings className="h-5 w-5 text-primary" />,
    title: "Step 4: Customize",
    description: "Remove irrelevant keywords by clicking the X icon, or visit Settings to configure preferences.",
    note: "Your queries are saved when you're logged in."
  }
];

export default UserGuide;
