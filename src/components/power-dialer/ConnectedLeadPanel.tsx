
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, User, MessageSquare } from "lucide-react";

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
  showPlaceholders?: boolean;
}

export const ConnectedLeadPanel = ({ leadData, isConnected, showPlaceholders = false }: ConnectedLeadPanelProps) => {
  // Show skeleton placeholders if explicitly requested or if we're connected but no data yet
  const showSkeletons = showPlaceholders || (isConnected && !leadData);
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between">
          Connected Lead Details
          <div className="flex space-x-2">
            {isConnected && (
              <Badge variant="default" className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                Connected
              </Badge>
            )}
            {showSkeletons && !isConnected && (
              <Badge variant="outline" className="px-2 py-1 text-xs rounded-full animate-pulse">
                Dialing...
              </Badge>
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
                <label className="text-sm text-gray-500 flex items-center gap-1">
                  <User className="h-4 w-4" /> Name
                </label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : !leadData ? (
                  <div className="text-sm mt-1 text-gray-400">No data available</div>
                ) : (
                  <div className="text-sm mt-1 font-medium">
                    {leadData.first_name} {leadData.last_name}
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500 flex items-center gap-1">
                  <Phone className="h-4 w-4" /> Phone
                </label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : !leadData ? (
                  <div className="text-sm mt-1 text-gray-400">No data available</div>
                ) : (
                  <div className="text-sm mt-1">
                    {leadData.phone1 || 'Not provided'}
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500 flex items-center gap-1">
                  <Mail className="h-4 w-4" /> Email
                </label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : !leadData ? (
                  <div className="text-sm mt-1 text-gray-400">No data available</div>
                ) : (
                  <div className="text-sm mt-1">
                    {leadData.email || 'Not provided'}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Address Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> Property Address
                </label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : !leadData ? (
                  <div className="text-sm mt-1 text-gray-400">No data available</div>
                ) : (
                  <div className="text-sm mt-1">
                    {leadData.property_address || 'Not provided'}
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> Mailing Address
                </label>
                {showSkeletons ? (
                  <Skeleton className="h-6 w-full mt-1" />
                ) : !leadData ? (
                  <div className="text-sm mt-1 text-gray-400">No data available</div>
                ) : (
                  <div className="text-sm mt-1">
                    {leadData.mailing_address || 'Not provided'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <h3 className="font-medium mb-2 flex items-center gap-1">
            <MessageSquare className="h-4 w-4" /> Notes
          </h3>
          {showSkeletons ? (
            <Skeleton className="h-24 w-full" />
          ) : !leadData ? (
            <div className="text-sm p-3 bg-gray-50 rounded-lg min-h-[6rem] text-center text-gray-400 flex items-center justify-center">
              No notes available
            </div>
          ) : (
            <div className="text-sm p-3 bg-gray-50 rounded-lg min-h-[6rem]">
              {/* Notes would be displayed here */}
              No notes available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
