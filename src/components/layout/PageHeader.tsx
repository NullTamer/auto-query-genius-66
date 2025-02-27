
import { Badge } from "@/components/ui/badge";
import { Terminal } from "lucide-react";

interface PageHeaderProps {
  updateCount: number;
  lastScrapeTime: string | null;
}

const PageHeader = ({ updateCount, lastScrapeTime }: PageHeaderProps) => {
  return (
    <div className="text-center mb-8 md:mb-12 animate-fade-in relative">
      <div className="absolute right-0 top-0">
        {updateCount > 0 && (
          <Badge 
            variant="outline"
            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium cyber-card neon-glow data-stream"
            title={`Updates: ${updateCount}`}
          >
            {updateCount}
          </Badge>
        )}
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4 neon-glow glitch">
        AutoSearchPro
      </h1>
      <p className="text-muted-foreground">
        <Terminal className="inline mr-2 h-4 w-4" />
        Transform job descriptions into powerful Boolean search queries
      </p>
      {lastScrapeTime && (
        <p className="text-sm text-primary/70 mt-2 data-stream">
          Last updated: {new Date(lastScrapeTime).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default PageHeader;
