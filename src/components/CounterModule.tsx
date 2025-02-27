
import { useState, useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface CounterModuleProps {
  className?: string;
}

const CounterModule = ({ className }: CounterModuleProps) => {
  const [count, setCount] = useState(0);
  const [activeToggles, setActiveToggles] = useState<string[]>([]);

  const handleToggleChange = (value: string[]) => {
    setActiveToggles(value);
    toast.info(`Toggled: ${value.join(", ") || "none"}`);
  };

  const handleIncrement = () => {
    setCount((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setCount((prev) => Math.max(0, prev - 1));
  };

  const handleReset = () => {
    setCount(0);
    setActiveToggles([]);
    toast.success("Counter reset");
  };

  useEffect(() => {
    if (count > 0 && count % 10 === 0) {
      toast.success(`Milestone reached: ${count}`);
    }
  }, [count]);

  return (
    <div className={`cyber-card p-4 space-y-4 ${className}`}>
      <h3 className="text-xl font-bold text-primary neon-glow">Test Counter Module</h3>
      
      <div className="flex justify-center items-center gap-4 p-3 bg-secondary/20 rounded-md">
        <Button 
          variant="outline" 
          size="icon"
          onClick={handleDecrement}
          className="cyber-card hover:neon-glow"
        >
          <Minus className="h-4 w-4" />
        </Button>
        
        <Badge 
          variant="outline" 
          className="h-10 w-16 text-xl flex items-center justify-center cyber-card neon-glow data-stream"
        >
          {count}
        </Badge>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={handleIncrement}
          className="cyber-card hover:neon-glow"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Toggle Numbers</div>
        <ToggleGroup 
          type="multiple" 
          className="justify-center flex-wrap"
          value={activeToggles} 
          onValueChange={handleToggleChange}
        >
          {[1, 2, 3, 4, 5].map((num) => (
            <ToggleGroupItem 
              key={num}
              value={num.toString()} 
              className="cyber-card data-stream hover:neon-glow"
            >
              {num}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      
      <div className="pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleReset}
          className="cyber-card hover:neon-glow transition-all flex items-center gap-2"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>
      
      {activeToggles.length > 0 && (
        <div className="text-xs text-primary/70 data-stream">
          Active: {activeToggles.join(", ")}
        </div>
      )}
    </div>
  );
};

export default CounterModule;
