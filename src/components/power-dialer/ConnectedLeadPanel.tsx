import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { useLeadRealtime } from '@/hooks/use-lead-realtime';
import { useAuth } from '@/hooks/use-auth';

interface ConnectedLeadPanelProps {
  leadData?: {
    [key: string]: any;
  };
  onRefresh?: () => void;
}

export const ConnectedLeadPanel = ({ leadData: initialLeadData, onRefresh }: ConnectedLeadPanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const currentLeadId = initialLeadData?.id || null;
  
  const { leadData: realtimeLeadData, isLoading: isRealtimeLoading, leadFound, refresh } = 
    useLeadRealtime(currentLeadId, user?.id);
  
  const displayData = realtimeLeadData || initialLeadData;

  useEffect(() => {
    console.log('[ConnectedLeadPanel] Current lead data:', {
      initial: initialLeadData,
      realtime: realtimeLeadData,
      display: displayData
    });
  }, [initialLeadData, realtimeLeadData, displayData]);

  const handleRefresh = () => {
    if (onRefresh) {
      setIsLoading(true);
      onRefresh();
      setTimeout(() => setIsLoading(false), 1000);
    } else if (refresh) {
      setIsLoading(true);
      refresh();
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  return (
    <>
      <LeadFoundIndicator isVisible={leadFound} />
      <Card className={`mt-4 ${leadFound ? 'border-2 border-green-500' : ''} relative`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            {displayData?.id ? (
              <div className="flex flex-1 justify-between items-center">
                <span>Lead Details</span>
                <Badge variant="outline" className="ml-2 bg-blue-50">Lead ID: {displayData.id}</Badge>
              </div>
            ) : ( 
              'Lead Details - No Lead ID Available'
            )}
            <Button 
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Refresh'
              )}
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
                    {`${displayData?.first_name || ''} ${displayData?.last_name || ''}`}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-500">Primary Phone</label>
                  <div className="text-sm mt-1 font-medium">
                    {displayData?.phone1 || "---"}
                  </div>
                </div>

                {displayData?.phone2 && (
                  <div>
                    <label className="text-sm text-gray-500">Secondary Phone</label>
                    <div className="text-sm mt-1 font-medium">
                      {displayData?.phone2}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <div className="text-sm mt-1 font-medium">
                    {displayData?.email || "---"}
                  </div>
                </div>

                {displayData?.disposition && (
                  <div>
                    <label className="text-sm text-gray-500">Disposition</label>
                    <div className="text-sm mt-1 font-medium">
                      {displayData?.disposition}
                    </div>
                  </div>
                )}

                {displayData?.tags && displayData.tags.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-500">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {displayData.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
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
    </>
  );
};
