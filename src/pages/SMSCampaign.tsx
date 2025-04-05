
import React from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SMSSidebar from "@/components/sms/SMSSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const SMSCampaign = () => {
  const navigate = useNavigate();

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen overflow-hidden w-full">
        <SMSSidebar />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex items-center">
              <Button 
                variant="outline" 
                className="rounded-full mr-4"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold">SMS Campaign</h1>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Create a New SMS Campaign</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Campaign Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Campaign Name</label>
                      <input
                        type="text"
                        placeholder="Enter campaign name"
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Message Template</label>
                      <textarea
                        rows={5}
                        placeholder="Type your SMS message here..."
                        className="w-full px-3 py-2 border rounded-md"
                      />
                      <p className="text-xs text-gray-500 mt-1">Character count: 0/160</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Schedule</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input type="radio" name="schedule" className="mr-2" defaultChecked />
                          <span>Send Now</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="schedule" className="mr-2" />
                          <span>Schedule</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Recipients</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Select Recipients</label>
                      <select className="w-full px-3 py-2 border rounded-md">
                        <option>All Leads</option>
                        <option>Recent Contacts</option>
                        <option>Custom List</option>
                      </select>
                    </div>
                    
                    <div className="border rounded-md p-3 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Selected Recipients</span>
                        <span className="text-sm text-blue-600">0 contacts</span>
                      </div>
                      <div className="h-32 border rounded-md bg-white p-2">
                        <p className="text-gray-400 text-center mt-12">No contacts selected</p>
                      </div>
                    </div>
                    
                    <Button className="w-full" variant="dialer">Upload Contact List</Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-4">
                <Button variant="outline">Save Draft</Button>
                <Button variant="dialer">Send Campaign</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SMSCampaign;
