
import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  chart?: React.ReactNode;
}

const MetricCard = ({ title, value, subtitle, icon, chart }: MetricCardProps) => {
  return (
    <div className="metric-card rounded-2xl">
      <div className="flex flex-col h-full">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{title}</div>
        <div className="text-2xl font-semibold mb-1">{value}</div>
        {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
        {chart && <div className="mt-auto pt-3">{chart}</div>}
      </div>
    </div>
  );
};

export default MetricCard;

