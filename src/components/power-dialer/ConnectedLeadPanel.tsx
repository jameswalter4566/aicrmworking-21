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
  isConnected: boolean;
  isDialing?: boolean;
  forceSkeleton?: boolean;
  sessionActive?: boolean;
}

export const ConnectedLeadPanel = ({ 
  leadData, 
  isConnected, 
  isDialing = false,
  forceSkeleton = false,
  sessionActive = false
}: ConnectedLeadPanelProps) => {
  const showSkeletons = forceSkeleton && !leadData;
  
  useEffect(() => {
    console.log('ConnectedLeadPanel force render with:', { 
      leadData, 
      showSkeletons,
      hasData: !!leadData,
      dataKeys: leadData ? Object.keys(leadData) : []
    });
  }, [leadData, showSkeletons]);

  const getFormattedName = () => {
    if (!leadData) return '';
    if (!leadData.first_name && !leadData.last_name) return '';
    return `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim();
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between">
          Connected Lead Details
          <div className="flex space-x-2">
            {leadData && (
              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                Data Loaded
              </span>
            )}
            {!leadData && isDialing && (
              <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                Loading...
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Name</label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1 font-medium">
                    {getFormattedName() || "---"}
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1 font-medium">{leadData?.phone1 || "---"}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Email</label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1 font-medium">{leadData?.email || "---"}</div>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Address Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Property Address</label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1 font-medium">{leadData?.property_address || "---"}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Mailing Address</label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1 font-medium">{leadData?.mailing_address || "---"}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
