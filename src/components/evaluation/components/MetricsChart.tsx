
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { MetricsResult } from "../types";

interface MetricsChartProps {
  overall: MetricsResult;
  baseline: MetricsResult;
}

const MetricsChart: React.FC<MetricsChartProps> = ({ overall, baseline }) => {
  // Prepare chart data with safe values
  const metricsData = [
    {
      name: "Precision",
      AI: parseFloat(((overall?.precision || 0) * 100).toFixed(2)),
      Baseline: parseFloat(((baseline?.precision || 0) * 100).toFixed(2)),
    },
    {
      name: "Recall",
      AI: parseFloat(((overall?.recall || 0) * 100).toFixed(2)),
      Baseline: parseFloat(((baseline?.recall || 0) * 100).toFixed(2)),
    },
    {
      name: "F1 Score",
      AI: parseFloat(((overall?.f1Score || 0) * 100).toFixed(2)),
      Baseline: parseFloat(((baseline?.f1Score || 0) * 100).toFixed(2)),
    },
  ];

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={metricsData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis unit="%" domain={[0, 100]} />
          <Tooltip formatter={(value) => [`${value}%`, '']} />
          <Legend />
          <Bar dataKey="AI" fill="#22c55e" name="AI Algorithm" />
          <Bar dataKey="Baseline" fill="#3b82f6" name="Baseline" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricsChart;
