
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface QueryPreviewProps {
  query: string;
}

const QueryPreview: React.FC<QueryPreviewProps> = ({ query }) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(query);
      toast.success("Query copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy query");
    }
  };

  return (
    <Card className="p-6 backdrop-blur-lg bg-glass shadow-lg animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-secondary">Boolean Query</h2>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={copyToClipboard}
        >
          <Copy size={16} />
          Copy
        </Button>
      </div>
      <ScrollArea className="h-[200px] w-full">
        <pre className="text-sm font-mono bg-muted p-4 rounded-md whitespace-pre-wrap">
          {query}
        </pre>
      </ScrollArea>
    </Card>
  );
};

export default QueryPreview;
