
import KeywordDisplay from "@/components/KeywordDisplay";
import StatisticsModule from "@/components/StatisticsModule";
import { Keyword } from "@/hooks/useKeywords";

interface KeywordResultsSectionProps {
  keywords: Keyword[];
  onRemoveKeyword: (keyword: string) => void;
}

const KeywordResultsSection: React.FC<KeywordResultsSectionProps> = ({
  keywords,
  onRemoveKeyword
}) => {
  return (
    <div className="space-y-6">
      <KeywordDisplay
        keywords={keywords}
        onRemoveKeyword={onRemoveKeyword}
      />
      <StatisticsModule keywords={keywords} />
    </div>
  );
};

export default KeywordResultsSection;
