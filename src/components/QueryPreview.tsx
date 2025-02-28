
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface QueryPreviewProps {
  query: string;
}

const QueryPreview: React.FC<QueryPreviewProps> = ({ query }) => {
  const handleCopyQuery = async () => {
    try {
      await navigator.clipboard.writeText(query);
      toast.success("Boolean query copied to clipboard!");
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Failed to copy query. Please try manually.");
    }
  };

  return (
    <Card className="cyber-card p-4 md:p-6 mt-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
            Boolean Query
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="cyber-card hover:neon-glow transition-all"
            onClick={handleCopyQuery}
            disabled={!query}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Query
          </Button>
        </div>
        <div className="bg-background/50 border border-primary/20 p-4 rounded-md min-h-[100px] whitespace-pre-wrap">
          {query || "Your Boolean query will appear here..."}
        </div>
      </div>
    </Card>
  );
};

export default QueryPreview;
