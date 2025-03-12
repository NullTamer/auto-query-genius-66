
import React from "react";
import { AlertTriangle } from "lucide-react";

const FormatDocumentation: React.FC = () => {
  return (
    <div className="bg-primary/10 rounded-md p-4 text-sm">
      <h4 className="flex items-center text-primary font-medium mb-2">
        <AlertTriangle className="h-4 w-4 mr-2" />
        Dataset Format
      </h4>
      <p className="mb-2">The evaluation tool accepts the following file formats:</p>
      
      <div className="space-y-4">
        <div>
          <h5 className="font-medium text-xs mb-1">JSON Format</h5>
          <pre className="bg-black/20 p-3 rounded text-xs overflow-auto">
{`[
  {
    "id": "job1",
    "description": "Full job description text...",
    "groundTruth": [
      { "keyword": "React", "frequency": 5, "category": "technical" },
      { "keyword": "JavaScript", "frequency": 4 }
    ]
  },
  ...
]`}
          </pre>
        </div>
        
        <div>
          <h5 className="font-medium text-xs mb-1">CSV Format</h5>
          <pre className="bg-black/20 p-3 rounded text-xs overflow-auto">
{`id,description,groundTruth
job1,"Full job description text...","React:5,JavaScript:4,TypeScript:3"
job2,"Another job description...","Python:6,AWS:4,Docker:2"
...`}
          </pre>
          <p className="mt-1 text-xs">
            For CSV files, the groundTruth column should contain comma-separated keyword:frequency pairs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FormatDocumentation;
