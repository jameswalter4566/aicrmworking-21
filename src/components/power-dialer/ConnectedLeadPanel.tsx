
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
  showPlaceholders: boolean;
}

export const ConnectedLeadPanel = ({ leadData, isConnected, showPlaceholders = false }: ConnectedLeadPanelProps) => {
  // Display skeletons if explicitly told to show placeholders or if isConnected but no leadData yet
  const shouldShowSkeletons = showPlaceholders || (isConnected && !leadData);
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between">
          Connected Lead Details
          <div className="flex space-x-2">
            {isConnected && (
              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                Connected
              </span>
            )}
            {shouldShowSkeletons && !isConnected && (
              <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-full">
                Dialing...
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
                {shouldShowSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1">
                    {leadData?.first_name} {leadData?.last_name}
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Phone</label>
                {shouldShowSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1">{leadData?.phone1}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Email</label>
                {shouldShowSkeletons ? (
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
                {shouldShowSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : (
                  <div className="text-sm mt-1">{leadData?.property_address}</div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500">Mailing Address</label>
                {shouldShowSkeletons ? (
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
          {shouldShowSkeletons ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="text-sm p-3 bg-gray-50 rounded-lg min-h-[6rem]">
              No notes available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
