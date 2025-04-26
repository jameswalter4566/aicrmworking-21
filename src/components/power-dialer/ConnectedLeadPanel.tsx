
import React, { useEffect, useRef } from 'react';
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
  // Add a ref to track renders
  const renderCount = useRef(0);
  
  // Debug logging to track data flow and component renders
  useEffect(() => {
    renderCount.current += 1;
    
    console.log(`[ConnectedLeadPanel] RENDER #${renderCount.current} with data:`, leadData);
    
    if (leadData) {
      console.log("[ConnectedLeadPanel] Lead details available:", {
        name: `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() || 'Unknown',
        phone: leadData.phone1 || '---',
        email: leadData.email || '---',
        property_address: leadData.property_address || '---',
        mailing_address: leadData.mailing_address || '---'
      });
      
      // Log all keys and values to ensure data structure is as expected
      console.log("[ConnectedLeadPanel] Raw leadData keys:", Object.keys(leadData));
      console.log("[ConnectedLeadPanel] Raw leadData values:", Object.values(leadData));
    } else {
      console.log("[ConnectedLeadPanel] No lead data available");
    }
    
    // Force DOM to update
    setTimeout(() => {
      console.log("[ConnectedLeadPanel] DOM update check after timeout");
    }, 0);
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
    console.log("[ConnectedLeadPanel] Rendering skeleton (no data)");
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

  // When data is available, display it with additional debug info
  console.log("[ConnectedLeadPanel] Rendering filled data");
  return (
    <Card className="mt-4 border-2 border-green-500">
      <CardHeader className="pb-2 bg-green-50">
        <CardTitle className="text-lg flex justify-between">
          <span>Lead Details - {getFormattedName()}</span>
          <span className="text-xs text-green-700">Data Present</span>
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

        {/* Debug info section */}
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <div className="font-semibold">Debug Info</div>
          <div>Raw data keys: {Object.keys(leadData).join(', ')}</div>
        </div>
      </CardContent>
    </Card>
  );
};
