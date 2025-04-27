
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { useLeadRealtime } from '@/hooks/use-lead-realtime';
import { useAuth } from '@/hooks/use-auth';
import { LeadFoundIndicator } from '@/components/LeadFoundIndicator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConnectedLeadPanelProps {
  leadData?: {
    [key: string]: any;
  };
  onRefresh?: () => void;
}

export const ConnectedLeadPanel = ({ leadData: initialLeadData, onRefresh }: ConnectedLeadPanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [localLeadFound, setLocalLeadFound] = useState(false);
  const [manualLeadData, setManualLeadData] = useState<any>(null);
  const { user } = useAuth();
  const currentLeadId = initialLeadData?.id || null;
  
  const { leadData: realtimeLeadData, isLoading: isRealtimeLoading, leadFound, refresh } = 
    useLeadRealtime(currentLeadId, user?.id);
  
  // Prioritize manually fetched data, then realtime data, then initial data
  const displayData = manualLeadData || realtimeLeadData || initialLeadData;

  useEffect(() => {
    console.log('[ConnectedLeadPanel] Current lead data:', {
      initial: initialLeadData,
      realtime: realtimeLeadData,
      manual: manualLeadData,
      display: displayData
    });
    
    if (displayData && (realtimeLeadData || localLeadFound === false)) {
      setLocalLeadFound(true);
      setTimeout(() => setLocalLeadFound(false), 3000);
    }
  }, [initialLeadData, realtimeLeadData, manualLeadData, displayData, localLeadFound]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      console.log('Manually refreshing lead data for ID:', currentLeadId);
      
      const { data, error } = await supabase.functions.invoke('lead-connected', {
        body: { 
          leadId: String(currentLeadId),
          userId: user?.id,
          callData: {
            status: 'manual_refresh',
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Error refreshing lead data:', error);
        toast.error('Failed to refresh lead data');
        return;
      }

      console.log("Response from lead-connected:", data);

      if (data?.lead) {
        console.log('Successfully retrieved fresh lead data:', data.lead);
        // Store the manually fetched data to ensure it displays
        setManualLeadData(data.lead);
        setLocalLeadFound(true);
        setTimeout(() => setLocalLeadFound(false), 3000);
        toast.success('Lead data refreshed successfully');
      } else {
        toast.error('No lead data in response');
      }

      // Call the original refresh handlers if they exist
      if (onRefresh) onRefresh();
      if (refresh) refresh();
      
    } catch (err) {
      console.error('Error in manual refresh:', err);
      toast.error('Error refreshing lead data');
    } finally {
      setIsLoading(false);
    }
  };

  // We're using both the hook's leadFound state and our local state
  const showLeadFound = leadFound || localLeadFound;

  return (
    <>
      <LeadFoundIndicator isVisible={showLeadFound} />
      
      <Card className={`mt-4 ${showLeadFound ? 'border-2 border-green-500 transition-all duration-500' : ''} relative`}>
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
          {isLoading || isRealtimeLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[160px]" />
              <Skeleton className="h-4 w-[180px]" />
            </div>
          ) : displayData ? (
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

                  {displayData?.phone2 && displayData.phone2 !== "---" && (
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
                        {displayData.tags.map((tag: string, index: number) => (
                          <Badge key={`${tag}-${index}`} variant="outline">{tag}</Badge>
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
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No lead data available</p>
              <Button 
                onClick={handleRefresh}
                variant="outline" 
                size="sm"
                className="mt-2"
              >
                Refresh Data
              </Button>
            </div>
          )}

          <div className="mt-4 p-2 bg-gray-100 rounded">
            <details>
              <summary className="cursor-pointer text-sm text-gray-600">Raw Lead Data</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {displayData ? JSON.stringify(displayData, null, 2) : "No data available"}
              </pre>
            </details>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
