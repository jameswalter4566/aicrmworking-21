
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectedLeadPanelProps {
  leadData?: {
    first_name?: string;
    last_name?: string;
    phone1?: string;
    email?: string;
    property_address?: string;
    mailing_address?: string;
  };
}

export const ConnectedLeadPanel = ({ leadData }: ConnectedLeadPanelProps) => {
  // Debug logging to track data flow
  useEffect(() => {
    console.log("[ConnectedLeadPanel] Received lead data:", leadData);
    
    if (leadData) {
      console.log("[ConnectedLeadPanel] Lead details available:", {
        name: `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() || 'Unknown',
        phone: leadData.phone1 || '---',
        email: leadData.email || '---',
        property_address: leadData.property_address || '---',
        mailing_address: leadData.mailing_address || '---'
      });
    } else {
      console.log("[ConnectedLeadPanel] No lead data available");
    }
  }, [leadData]);

  // Format the lead name consistently
  const getFormattedName = () => {
    if (!leadData) return 'Unknown Contact';
    const firstName = leadData.first_name || '';
    const lastName = leadData.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'Unknown Contact';
  };

  // Display skeleton loader when no data is available
  if (!leadData) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Lead Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Name</label>
                  <Skeleton className="h-6 w-full mt-1" />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <Skeleton className="h-6 w-full mt-1" />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <Skeleton className="h-6 w-full mt-1" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Address Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Property Address</label>
                  <Skeleton className="h-6 w-full mt-1" />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Mailing Address</label>
                  <Skeleton className="h-6 w-full mt-1" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // When data is available, display it
  return (
    <Card className="mt-4 border-2 border-green-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Lead Details - {getFormattedName()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <div className="text-sm mt-1 font-medium">{getFormattedName()}</div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <div className="text-sm mt-1 font-medium">{leadData.phone1 || "---"}</div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <div className="text-sm mt-1 font-medium">{leadData.email || "---"}</div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Address Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Property Address</label>
                <div className="text-sm mt-1 font-medium">{leadData.property_address || "---"}</div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Mailing Address</label>
                <div className="text-sm mt-1 font-medium">{leadData.mailing_address || "---"}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
