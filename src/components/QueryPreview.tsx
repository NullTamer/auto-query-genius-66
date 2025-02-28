
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Copy } from "lucide-react";
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
    <Card className="cyber-card p-4 md:p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-semibold text-primary neon-glow">
          <Terminal className="inline mr-2 h-5 w-5" />
          Boolean Query
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
          onClick={copyToClipboard}
        >
          <Copy size={16} />
          Copy
        </Button>
      </div>
      <ScrollArea className="h-[200px] w-full matrix-loader">
        <pre className="text-sm font-mono bg-background/50 p-4 rounded-md whitespace-pre-wrap border border-primary/20">
          {query}
        </pre>
      </ScrollArea>
    </Card>
  );
};

export default QueryPreview;
