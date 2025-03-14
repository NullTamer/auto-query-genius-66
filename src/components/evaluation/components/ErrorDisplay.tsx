
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type ErrorSeverity = "warning" | "error" | "info";

interface ErrorDisplayProps {
  error: string | null;
  title?: string;
  severity?: ErrorSeverity;
  className?: string;
  showNetworkTips?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  title, 
  severity = "error",
  className,
  showNetworkTips = false
}) => {
  if (!error) return null;
  
  const isNetworkError = error.includes("ERR_BLOCKED_BY_CLIENT") || 
                        error.includes("network") || 
                        error.includes("failed to fetch") ||
                        error.includes("connection");
  
  // Map our severity to the Alert component's variant prop
  const variant = severity === "error" ? "destructive" : 
                severity === "warning" ? "warning" : "default";
  
  const bgColor = severity === "error" ? "bg-destructive/10 border-destructive" : 
                severity === "warning" ? "bg-yellow-500/10 border-yellow-500/50" : 
                "bg-muted/50 border-muted";
  
  return (
    <Alert 
      variant={variant as "default" | "destructive" | "warning"} 
      className={cn(bgColor, className)}
    >
      {isNetworkError ? (
        <WifiOff className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      
      {title && <AlertTitle>{title}</AlertTitle>}
      
      <AlertDescription className="space-y-2">
        <p>{error}</p>
        
        {isNetworkError && showNetworkTips && (
          <div className="text-xs mt-2 p-2 bg-background/50 rounded-sm">
            <p className="font-medium mb-1">Possible solutions:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Check your internet connection</li>
              <li>Disable ad blockers or privacy extensions</li>
              <li>Try using a different browser</li>
              <li>If on a corporate network, check firewall settings</li>
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ErrorDisplay;
