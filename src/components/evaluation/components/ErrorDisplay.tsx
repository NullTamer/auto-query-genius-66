
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ErrorDisplayProps {
  error: string | null;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  if (!error) return null;
  
  return (
    <Alert variant="destructive" className="bg-destructive/10 border-destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        {error}
      </AlertDescription>
    </Alert>
  );
};

export default ErrorDisplay;
