
import React from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Keyword } from "@/hooks/useKeywords";

interface RecommendedSearchModuleProps {
  keywords: Keyword[];
  onSelectCombination: (terms: string[]) => void;
}

const RecommendedSearchModule: React.FC<RecommendedSearchModuleProps> = ({ 
  keywords,
  onSelectCombination,
}) => {
  // Generate recommended combinations based on keyword statistics
  const getRecommendedCombinations = () => {
    if (!keywords || keywords.length < 3) {
      return [];
    }

    // Sort keywords by frequency
    const sortedKeywords = [...keywords].sort((a, b) => b.frequency - a.frequency);
    
    // Get top technical keywords - simple heuristic for detecting tech terms
    const technicalKeywords = sortedKeywords.filter(k => 
      ['python', 'javascript', 'typescript', 'react', 'node', 'golang', 'java', 
       'aws', 'cloud', 'docker', 'kubernetes', 'sql', 'nosql', 'api', 
       'frontend', 'backend', 'fullstack', 'devops', 'ci/cd', 'agile',
       'microservices', 'database', 'analytics', 'algorithm']
      .some(tech => k.keyword.toLowerCase().includes(tech))
    ).slice(0, 5);
    
    // Get top soft skills
    const softSkillKeywords = sortedKeywords.filter(k => 
      ['communication', 'team', 'leadership', 'problem-solving', 'collaboration', 
       'management', 'organization', 'creativity', 'critical', 'detail',
       'adaptability', 'flexibility', 'time', 'planning', 'interpersonal']
      .some(soft => k.keyword.toLowerCase().includes(soft))
    ).slice(0, 3);
    
    // Create different combinations
    const combinations = [
      {
        name: "Technical Focus",
        description: "Emphasize technical skills",
        terms: technicalKeywords.slice(0, 3).map(k => k.keyword)
      },
      {
        name: "Balanced Approach",
        description: "Mix of technical and soft skills",
        terms: [...technicalKeywords.slice(0, 2), ...softSkillKeywords.slice(0, 1)]
          .map(k => k.keyword)
      },
      {
        name: "Top Keywords",
        description: "Most frequent keywords",
        terms: sortedKeywords.slice(0, 3).map(k => k.keyword)
      }
    ];
    
    // Filter out combinations with less than 2 terms
    return combinations.filter(c => c.terms.length >= 2);
  };

  const combinations = getRecommendedCombinations();

  if (combinations.length === 0) {
    return null;
  }

  return (
    <Card className="cyber-card p-4 md:p-6 animate-fade-in">
      <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5" />
        Recommended Searches
      </h2>
      
      <div className="space-y-4">
        {combinations.map((combo, index) => (
          <div 
            key={index}
            className="border border-primary/30 rounded-md p-3 hover:border-primary/50 transition-all bg-background/60"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-primary">{combo.name}</h3>
                <p className="text-sm text-muted-foreground">{combo.description}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={() => onSelectCombination(combo.terms)}
              >
                <Check className="mr-1 h-3 w-3" />
                Use This
              </Button>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-1">
              {combo.terms.map((term, i) => (
                <Badge key={i} variant="secondary" className="bg-primary/10">
                  {term}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecommendedSearchModule;
