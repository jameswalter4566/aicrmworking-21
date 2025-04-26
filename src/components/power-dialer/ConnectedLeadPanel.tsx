
import React from 'react';
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
}

export const ConnectedLeadPanel = ({ leadData, isConnected, isDialing = false }: ConnectedLeadPanelProps) => {
  // Show skeletons if we're dialing OR if we're connected but don't have lead data yet
  const showSkeletons = isDialing || (isConnected && !leadData);

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between">
          Connected Lead Details
          <div className="flex space-x-2">
            {isDialing && !isConnected && (
              <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                Dialing...
              </span>
            )}
            {isConnected && (
              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                Connected
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
                  <div className="text-sm mt-1">
                    {leadData?.first_name} {leadData?.last_name}
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1">{leadData?.phone1}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Email</label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1">{leadData?.email}</div>
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
                  <div className="text-sm mt-1">{leadData?.property_address}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Mailing Address</label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1">{leadData?.mailing_address}</div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <h3 className="font-medium mb-2">Notes</h3>
          {showSkeletons ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="text-sm p-3 bg-gray-50 rounded-lg min-h-[6rem]">
              {leadData ? "No notes available" : "No notes available"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
