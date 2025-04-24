import React from "react";
import { BarChart, Users, Phone, MessageSquare } from "lucide-react";
import { IndustryFeatures } from "./IndustryFeatures";

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ label, value, icon, color }: StatCardProps) => (
  <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200 flex items-start">
    <div className={`rounded-full p-2 md:p-3 ${color} bg-opacity-10 mr-3 md:mr-4 shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-lg md:text-2xl font-bold truncate">{value}</div>
      <div className="text-xs md:text-sm text-gray-600 truncate">{label}</div>
    </div>
  </div>
);

interface MockContentProps {
  industry: 'mortgage' | 'realEstate' | 'debtSettlement';
}

export const MockContent = ({ industry }: MockContentProps) => {
  return (
    <div className="p-8 bg-gray-50 flex-1">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Leads"
          value="1,234"
          icon={<Users className="h-6 w-6 text-blue-500" />}
          color="bg-blue-500"
        />
        <StatCard
          label="Calls Today"
          value="156"
          icon={<Phone className="h-6 w-6 text-green-500" />}
          color="bg-green-500"
        />
        <StatCard
          label="Messages"
          value="89"
          icon={<MessageSquare className="h-6 w-6 text-purple-500" />}
          color="bg-purple-500"
        />
        <StatCard
          label="Conversions"
          value="32%"
          icon={<BarChart className="h-6 w-6 text-orange-500" />}
          color="bg-orange-500"
        />
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <IndustryFeatures industry={industry} />
      </div>
    </div>
  );
};
