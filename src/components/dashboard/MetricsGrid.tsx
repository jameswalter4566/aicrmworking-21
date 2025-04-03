
import React from "react";
import MetricCard from "./MetricCard";
import SimpleLineChart from "./SimpleLineChart";

const chartData = [
  { value: 10 },
  { value: 40 },
  { value: 30 },
  { value: 60 },
  { value: 50 },
  { value: 80 },
  { value: 70 },
];

const MetricsGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      <MetricCard
        title="NEW LEADS"
        value="0"
        subtitle="0 unactioned"
      />
      <MetricCard
        title="AVG. CONTACT ATTEMPTS"
        value="0.00"
      />
      <MetricCard
        title="SPEED TO ACTION"
        value="N/A"
      />
      <MetricCard
        title="APPTS NEXT 30 DAYS"
        value="0"
        subtitle="1 task"
      />
      <MetricCard
        title="DEALS NEXT 30 DAYS"
        value="$1,400,000"
        subtitle="1 deal"
        chart={<SimpleLineChart data={chartData} />}
      />
    </div>
  );
};

export default MetricsGrid;
