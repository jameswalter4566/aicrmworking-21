
import React from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Filter } from "lucide-react";
import ActivityTable from "@/components/dashboard/ActivityTable";

// Sample data for contacts
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
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    phone: "(555) 123-4567",
    lastActivity: "Phone Call - Left Message",
    time: "3 hours ago",
    stage: "Prospect",
    assigned: "michelle team",
  },
  {
    id: 3,
    name: "Robert Smith",
    email: "robert@example.com",
    phone: "(555) 987-6543",
    lastActivity: "Email Sent - Property Details",
    time: "yesterday",
    stage: "Client",
    assigned: "john sales",
  },
];

const People = () => {
  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Button className="bg-crm-blue hover:bg-crm-blue/90">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="flex space-x-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search leads..."
            className="pl-10 w-full"
          />
        </div>
        <Button variant="outline" className="flex items-center">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="bg-white rounded-md border border-gray-200">
        <ActivityTable contacts={contacts} />
      </div>
    </MainLayout>
  );
};

export default People;
