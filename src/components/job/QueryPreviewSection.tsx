
import QueryPreview from "@/components/QueryPreview";
import { generateBooleanQuery } from "@/utils/queryUtils";
import { useEffect, useState } from "react";
import { Keyword } from "@/hooks/useKeywords";

interface QueryPreviewSectionProps {
  keywords: Keyword[];
}

const QueryPreviewSection: React.FC<QueryPreviewSectionProps> = ({ keywords }) => {
  const [booleanQuery, setBooleanQuery] = useState("");

  // Update boolean query whenever keywords change
  useEffect(() => {
    console.log('Keywords updated, generating boolean query:', keywords);
    setBooleanQuery(generateBooleanQuery(keywords));
  }, [keywords]);

  return <QueryPreview query={booleanQuery} />;
};

export default QueryPreviewSection;
