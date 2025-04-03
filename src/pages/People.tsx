
import React, { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Filter, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Sample data for leads
const leadsData = [
  {
    id: 1,
    firstName: "Dan",
    lastName: "Corkill",
    email: "hi@followupboss.com",
    mailingAddress: "123 Main St, San Francisco, CA",
    propertyAddress: "456 Market St, San Francisco, CA",
    phone1: "(218) 304-6145",
    phone2: "",
    stage: "Lead",
    assigned: "study bolt",
  },
  {
    id: 2,
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.j@example.com",
    mailingAddress: "789 Oak Ave, New York, NY",
    propertyAddress: "321 Pine St, New York, NY",
    phone1: "(555) 123-4567",
    phone2: "(555) 987-6543",
    stage: "Prospect",
    assigned: "michelle team",
  },
  {
    id: 3,
    firstName: "Robert",
    lastName: "Smith",
    email: "robert@example.com",
    mailingAddress: "555 Cedar Ln, Los Angeles, CA",
    propertyAddress: "Same as mailing",
    phone1: "(555) 987-6543",
    phone2: "",
    stage: "Client",
    assigned: "john sales",
  },
];

const People = () => {
  const [leads, setLeads] = useState(leadsData);
  const [customFields, setCustomFields] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const addCustomField = () => {
    // Todo: Implement functionality to add custom fields
    const fieldName = prompt("Enter field name:");
    if (fieldName && fieldName.trim() !== "") {
      setCustomFields([...customFields, fieldName.trim()]);
    }
  };

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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="flex items-center">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center">
          <h2 className="font-medium text-gray-700">All Leads</h2>
          <div className="ml-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-gray-700"
              onClick={addCustomField}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Mailing Address</TableHead>
                <TableHead>Property Address</TableHead>
                <TableHead>Primary Phone</TableHead>
                <TableHead>Secondary Phone</TableHead>
                <TableHead>Email</TableHead>
                {customFields.map((field, index) => (
                  <TableHead key={index}>{field}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length > 0 ? (
                leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-gray-50">
                    <TableCell>{lead.firstName}</TableCell>
                    <TableCell>{lead.lastName}</TableCell>
                    <TableCell>{lead.mailingAddress}</TableCell>
                    <TableCell>{lead.propertyAddress}</TableCell>
                    <TableCell>{lead.phone1}</TableCell>
                    <TableCell>{lead.phone2}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    {customFields.map((field, index) => (
                      <TableCell key={index}>-</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7 + customFields.length} className="text-center py-8 text-gray-500">
                    No leads found. Add your first lead to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
};

export default People;
