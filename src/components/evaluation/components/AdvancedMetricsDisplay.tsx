
import React, { useState } from 'react';
import { AdvancedMetricsResult } from '../types';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ErrorBar,
  TooltipProps
} from "recharts";

interface AdvancedMetricsDisplayProps {
  advancedMetrics: AdvancedMetricsResult;
}

const AdvancedMetricsDisplay: React.FC<AdvancedMetricsDisplayProps> = ({ advancedMetrics }) => {
  const [activeTab, setActiveTab] = useState('table');
  
  // Format percentage with specified decimal places
  const formatPercentage = (value: number, decimals: number = 1) => {
    return (value * 100).toFixed(decimals) + '%';
  };
  
  // Prepare data for the box plot/error bar chart
  const chartData = [
    {
      name: "Precision",
      median: advancedMetrics.median.precision * 100,
      mean: advancedMetrics.mean.precision * 100,
      stdDev: advancedMetrics.stdDev.precision * 100,
      min: advancedMetrics.min.precision * 100,
      max: advancedMetrics.max.precision * 100,
    },
    {
      name: "Recall",
      median: advancedMetrics.median.recall * 100,
      mean: advancedMetrics.mean.recall * 100,
      stdDev: advancedMetrics.stdDev.recall * 100,
      min: advancedMetrics.min.recall * 100,
      max: advancedMetrics.max.recall * 100,
    },
    {
      name: "F1 Score",
      median: advancedMetrics.median.f1Score * 100,
      mean: advancedMetrics.mean.f1Score * 100,
      stdDev: advancedMetrics.stdDev.f1Score * 100,
      min: advancedMetrics.min.f1Score * 100,
      max: advancedMetrics.max.f1Score * 100,
    },
  ];
  
  // Custom tooltip formatter function with proper type handling
  const customTooltipFormatter = (value: any, name: any) => {
    if (typeof value !== 'number') {
      return [value, name];
    }
    
    if (name === 'stdDev') {
      return [`±${value.toFixed(1)}%`, 'Standard Deviation'];
    }
    
    if (typeof name === 'string') {
      return [`${value.toFixed(1)}%`, name.charAt(0).toUpperCase() + name.slice(1)];
    }
    
    return [`${value.toFixed(1)}%`, name];
  };
  
  return (
    <Card className="p-4 md:p-6 cyber-card">
      <h3 className="text-lg font-medium mb-4">Advanced Metrics Analysis</h3>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="chart">Chart View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Mean</TableHead>
                  <TableHead>Median</TableHead>
                  <TableHead>Std Dev</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Precision</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.mean.precision)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.median.precision)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.stdDev.precision)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.min.precision)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.max.precision)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Recall</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.mean.recall)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.median.recall)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.stdDev.recall)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.min.recall)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.max.recall)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">F1 Score</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.mean.f1Score)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.median.f1Score)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.stdDev.f1Score)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.min.f1Score)}</TableCell>
                  <TableCell>{formatPercentage(advancedMetrics.max.f1Score)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p><strong>Mean:</strong> Average value across all items</p>
            <p><strong>Median:</strong> Middle value when all values are sorted</p>
            <p><strong>Std Dev:</strong> Standard deviation (measure of variance)</p>
            <p><strong>Min/Max:</strong> Minimum and maximum values in the dataset</p>
          </div>
        </TabsContent>
        
        <TabsContent value="chart">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip formatter={customTooltipFormatter} />
                <Legend />
                <Bar dataKey="mean" fill="#22c55e" name="Mean">
                  <ErrorBar dataKey="stdDev" width={4} strokeWidth={2} stroke="#ef4444" direction="y" />
                </Bar>
                <Bar dataKey="median" fill="#3b82f6" name="Median" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>The error bars represent ±1 standard deviation from the mean value.</p>
            <p>Larger error bars indicate greater variability in the metrics across evaluated items.</p>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default AdvancedMetricsDisplay;
