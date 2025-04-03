
import React from "react";
import MainLayout from "@/components/layouts/MainLayout";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import ActivityTable from "@/components/dashboard/ActivityTable";
import FilterBar from "@/components/dashboard/FilterBar";
import { Button } from "@/components/ui/button";
import { FilterX } from "lucide-react";

// Sample data
const contacts = [
  {
    id: 1,
    name: "Dan Corkill",
    email: "hi@followupboss.com",
    phone: "(218) 304-6145",
    lastActivity: "Opened Email via Follow Up Boss",
    time: "an hour ago",
    stage: "Lead",
    assigned: "study bolt",
  },
];

const Index = () => {
  return (
    <MainLayout>
      <FilterBar />
      <MetricsGrid />
      
      <div className="bg-white p-4 rounded-md border border-gray-200 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-700 uppercase text-sm">Recent Activity</h2>
          <Button variant="outline" size="sm" className="text-xs">
            <FilterX className="h-3 w-3 mr-1" />
            Filter Activity
          </Button>
        </div>
        
        <ActivityTable contacts={contacts} />
        
        <div className="mt-4 flex justify-center">
          <Button variant="outline" className="bg-crm-blue text-white hover:bg-crm-blue/90">
            View all people
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
