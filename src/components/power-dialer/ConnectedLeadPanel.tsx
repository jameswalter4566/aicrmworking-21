
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectedLeadPanelProps {
  leadData?: {
    [key: string]: any;
  };
}

export const ConnectedLeadPanel = ({ leadData }: ConnectedLeadPanelProps) => {
  const [localLeadData, setLocalLeadData] = useState<any>(leadData);
  
  // Use either prop data or locally fetched data
  const displayData = localLeadData || leadData;
  
  // Update local data when prop data changes
  useEffect(() => {
    if (leadData) {
      setLocalLeadData(leadData);
    }
  }, [leadData]);

  // Display skeleton loader when no data is available
  if ((!displayData || Object.keys(displayData).length === 0)) {
    return (
      <Card className="mt-4 relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
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

  // Render lead data when available
  return (
    <Card className="mt-4 border-2 border-green-500 relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          Lead Details - {`${displayData?.first_name || ''} ${displayData?.last_name || ''}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                <div className="text-sm mt-1 font-medium">
                  {`${displayData?.first_name || ''} ${displayData?.last_name || ''}`}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <div className="text-sm mt-1 font-medium">
                  {displayData?.phone1 || "---"}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <div className="text-sm mt-1 font-medium">
                  {displayData?.email || "---"}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Address Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Property Address</label>
                <div className="text-sm mt-1 font-medium">
                  {displayData?.property_address || "---"}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Mailing Address</label>
                <div className="text-sm mt-1 font-medium">
                  {displayData?.mailing_address || "---"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Debug data display */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-100 rounded">
            <details>
              <summary className="cursor-pointer text-sm text-gray-600">Raw Lead Data</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(displayData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
