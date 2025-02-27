
import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Keyword } from "@/hooks/useKeywords";
import { PieChart, BarChart2, Zap, Award } from "lucide-react";

interface StatisticsModuleProps {
  keywords: Keyword[];
}

const StatisticsModule: React.FC<StatisticsModuleProps> = ({ keywords }) => {
  const stats = useMemo(() => {
    if (!keywords.length) return null;

    // Get top keywords
    const topKeywords = [...keywords]
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3)
      .map(k => k.keyword);

    // Calculate average frequency
    const avgFrequency = 
      keywords.reduce((sum, k) => sum + k.frequency, 0) / keywords.length;

    // Count frequencies by level
    const frequencyDistribution = {
      high: keywords.filter(k => k.frequency >= 4).length,
      medium: keywords.filter(k => k.frequency >= 2 && k.frequency < 4).length,
      low: keywords.filter(k => k.frequency < 2).length,
    };

    // Identify potential categories
    const techKeywords = keywords.filter(k => 
      ['python', 'javascript', 'react', 'node', 'postgresql', 'supabase', 'sql', 'api', 'aws', 'docker', 'kubernetes']
      .includes(k.keyword.toLowerCase())
    ).length;
    
    const softSkillKeywords = keywords.filter(k => 
      ['communication', 'teamwork', 'leadership', 'problem-solving', 'collaboration', 'agile']
      .includes(k.keyword.toLowerCase())
    ).length;

    return {
      topKeywords,
      avgFrequency,
      frequencyDistribution,
      keywordTypes: {
        technical: techKeywords,
        softSkills: softSkillKeywords,
        other: keywords.length - techKeywords - softSkillKeywords
      }
    };
  }, [keywords]);

  if (!stats) {
    return (
      <Card className="cyber-card p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow mb-4">
          <BarChart2 className="inline mr-2 h-5 w-5" />
          Keyword Statistics
        </h2>
        <div className="text-muted-foreground italic">
          No statistics available yet...
        </div>
      </Card>
    );
  }

  return (
    <Card className="cyber-card p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow mb-4">
        <BarChart2 className="inline mr-2 h-5 w-5" />
        Keyword Statistics
      </h2>
      
      <div className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="text-md font-medium flex items-center gap-2">
            <Award className="h-4 w-4" /> Top Keywords
          </h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {stats.topKeywords.map((keyword, index) => (
              <span key={index} className="text-primary neon-text px-2 py-1 bg-primary/10 rounded-md">
                {keyword}
              </span>
            ))}
          </div>
        </div>
        
        <div className="border-b border-border pb-2">
          <h3 className="text-md font-medium flex items-center gap-2">
            <PieChart className="h-4 w-4" /> Keyword Distribution
          </h3>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-500">{stats.frequencyDistribution.high}</div>
              <div className="text-xs text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-500">{stats.frequencyDistribution.medium}</div>
              <div className="text-xs text-muted-foreground">Medium Priority</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-500">{stats.frequencyDistribution.low}</div>
              <div className="text-xs text-muted-foreground">Low Priority</div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" /> Skill Breakdown
          </h3>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="text-center">
              <div className="text-lg font-semibold text-cyan-500">{stats.keywordTypes.technical}</div>
              <div className="text-xs text-muted-foreground">Technical</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-500">{stats.keywordTypes.softSkills}</div>
              <div className="text-xs text-muted-foreground">Soft Skills</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-500">{stats.keywordTypes.other}</div>
              <div className="text-xs text-muted-foreground">Other</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StatisticsModule;
