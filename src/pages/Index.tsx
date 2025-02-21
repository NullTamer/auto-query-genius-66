
import { useState, useCallback } from "react";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";

const extractKeywords = (text: string): string[] => {
  // Simple keyword extraction for now - split by spaces and filter
  const words = text.toLowerCase().split(/\s+/);
  const stopwords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to"]);
  return [...new Set(words.filter(word => word.length > 2 && !stopwords.has(word)))];
};

const generateBooleanQuery = (keywords: string[]): string => {
  if (keywords.length === 0) return "";
  // Simple query generation for now
  const essentialTerms = keywords.slice(0, 3).join(" AND ");
  const optionalTerms = keywords.slice(3).join(" OR ");
  return `(${essentialTerms})${optionalTerms ? ` AND (${optionalTerms})` : ""}`;
};

const Index = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [booleanQuery, setBooleanQuery] = useState("");

  const handleGenerateQuery = useCallback(() => {
    const extractedKeywords = extractKeywords(jobDescription);
    setKeywords(extractedKeywords);
    setBooleanQuery(generateBooleanQuery(extractedKeywords));
  }, [jobDescription]);

  const handleRemoveKeyword = useCallback((keyword: string) => {
    setKeywords(prev => {
      const newKeywords = prev.filter(k => k !== keyword);
      setBooleanQuery(generateBooleanQuery(newKeywords));
      return newKeywords;
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold text-secondary mb-4">
            AutoSearchPro
          </h1>
          <p className="text-muted-foreground">
            Transform job descriptions into powerful Boolean search queries
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <JobDescriptionInput
            value={jobDescription}
            onChange={setJobDescription}
            onSubmit={handleGenerateQuery}
          />
          <KeywordDisplay
            keywords={keywords}
            onRemoveKeyword={handleRemoveKeyword}
          />
        </div>

        <QueryPreview query={booleanQuery} />
      </div>
    </div>
  );
};

export default Index;
