
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ConnectedLeadPanelProps {
  leadData?: {
    [key: string]: any;
  };
  onRefresh?: () => void;
}

export const ConnectedLeadPanel = ({ leadData, onRefresh }: ConnectedLeadPanelProps) => {
  // Debug logging to track data flow
  useEffect(() => {
    console.log("[ConnectedLeadPanel] Raw lead data:", leadData);
  }, [leadData]);

  // Display skeleton loader when no data is available
  if (!leadData) {
    return (
      <Card className="mt-4 relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            Lead Details
            <Button 
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
            >
              Retrieve Latest Lead
            </Button>
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
    <Card className="mt-4 border-2 border-green-500 relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          Lead Details - {`${leadData?.first_name || ''} ${leadData?.last_name || ''}`}
          <Button 
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
          >
            Retrieve Latest Lead
          </Button>
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
                  {`${leadData?.first_name || ''} ${leadData?.last_name || ''}`}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                <div className="text-sm mt-1 font-medium">
                  {leadData?.phone1 || "---"}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <div className="text-sm mt-1 font-medium">
                  {leadData?.email || "---"}
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
                  {leadData?.property_address || "---"}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Mailing Address</label>
                <div className="text-sm mt-1 font-medium">
                  {leadData?.mailing_address || "---"}
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
                {JSON.stringify(leadData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
