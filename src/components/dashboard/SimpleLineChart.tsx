
import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SimpleLineChartProps {
  data: Array<{ value: number }>;
  color?: string;
}

const SimpleLineChart = ({ data, color = "#33C3F0" }: SimpleLineChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SimpleLineChart;
