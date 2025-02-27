
import KeywordDisplay from "@/components/KeywordDisplay";
import QueryPreview from "@/components/QueryPreview";

interface KeywordSectionProps {
  keywords: Array<{
    keyword: string;
    category?: string;
    frequency: number;
  }>;
  booleanQuery: string;
  onRemoveKeyword: (keyword: string) => void;
}

const KeywordSection = ({
  keywords,
  booleanQuery,
  onRemoveKeyword
}: KeywordSectionProps) => {
  return (
    <>
      <KeywordDisplay
        keywords={keywords}
        onRemoveKeyword={onRemoveKeyword}
      />
      <QueryPreview query={booleanQuery} />
    </>
  );
};

export default KeywordSection;
