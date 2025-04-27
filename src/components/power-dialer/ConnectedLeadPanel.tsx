
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Bug, AlertCircle } from "lucide-react";
import { useLeadRealtime } from '@/hooks/use-lead-realtime';
import { useAuth } from '@/hooks/use-auth';
import { LeadFoundIndicator } from '@/components/LeadFoundIndicator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const { user } = useAuth();
  const currentLeadId = initialLeadData?.id || null;
  
  const { 
    leadData: realtimeLeadData, 
    isLoading: isRealtimeLoading, 
    leadFound, 
    refresh, 
    lastUpdateTime, 
    lastError,
    broadcastData
  } = useLeadRealtime(currentLeadId, user?.id);
  
  // Check realtime connection status
  useEffect(() => {
    const checkRealtimeConnection = () => {
      const status = supabase.getChannels().length > 0 ? 'connected' : 'disconnected';
      setConnectionStatus(status);
      console.log(`[ConnectedLeadPanel] Realtime connection status: ${status}`);
    };
    
    checkRealtimeConnection();
    
    const interval = setInterval(checkRealtimeConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for broadcast updates (separate from useLeadRealtime hook to ensure we have redundancy)
  useEffect(() => {
    if (!currentLeadId) return;
    
    const channelName = `lead-data-${currentLeadId}`;
    console.log(`[ConnectedLeadPanel] Setting up additional broadcast listener on channel: ${channelName}`);
    
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'lead_data_update' }, (payload) => {
        console.log('[ConnectedLeadPanel] Received broadcast lead data:', payload);
        if (payload.payload?.lead) {
          setManualLeadData(payload.payload.lead);
          setLocalLeadFound(true);
          setTimeout(() => setLocalLeadFound(false), 3000);
        }
      })
      .subscribe((status) => {
        console.log(`[ConnectedLeadPanel] Additional channel subscription status:`, status);
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentLeadId]);
  
  // Prioritize manually fetched data, then realtime data, then initial data
  const displayData = manualLeadData || realtimeLeadData || initialLeadData;

  useEffect(() => {
    console.log('[ConnectedLeadPanel] Current lead data:', {
      initial: initialLeadData,
      realtime: realtimeLeadData,
      manual: manualLeadData,
      display: displayData,
      lastUpdate: lastUpdateTime?.toISOString()
    });
    
    if (displayData && (realtimeLeadData || manualLeadData) && localLeadFound === false) {
      setLocalLeadFound(true);
      setTimeout(() => setLocalLeadFound(false), 3000);
    }
  }, [initialLeadData, realtimeLeadData, manualLeadData, displayData, localLeadFound, lastUpdateTime]);

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
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
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
        
        // Also try a direct broadcast - this is a backup mechanism
        if (broadcastData) {
          await broadcastData(data.lead);
        }
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

  // Force a data push to channel for debugging
  const forcePushData = async () => {
    if (!currentLeadId || !displayData) return;
    
    try {
      console.log('[ConnectedLeadPanel] Force pushing data to channel');
      
      if (broadcastData) {
        // Use the hook's broadcast function
        await broadcastData(displayData);
      } else {
        // Direct broadcast
        const channelName = `lead-data-${currentLeadId}`;
        await supabase.channel(channelName).send({
          type: 'broadcast',
          event: 'lead_data_update',
          payload: {
            lead: displayData,
            timestamp: new Date().toISOString(),
            source: 'force_push'
          }
        });
      }
      
      toast.success('Forced data broadcast to channel');
    } catch (err) {
      console.error('[ConnectedLeadPanel] Error force pushing data:', err);
      toast.error('Failed to push data to channel');
    }
  };

  // We're using both the hook's leadFound state and our local state
  const showLeadFound = leadFound || localLeadFound;

  return (
    <>
      <LeadFoundIndicator isVisible={showLeadFound} />
      
      {connectionStatus !== 'connected' && (
        <Alert variant="warning" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Realtime Connection Issue</AlertTitle>
          <AlertDescription>
            The realtime connection appears to be {connectionStatus}. This may affect data updates.
            <Button variant="outline" size="sm" className="ml-2" onClick={() => window.location.reload()}>
              Reconnect
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {lastError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Lead Data</AlertTitle>
          <AlertDescription>{lastError}</AlertDescription>
        </Alert>
      )}
      
      <Card className={`mt-4 ${showLeadFound ? 'border-2 border-green-500 transition-all duration-500' : ''} relative`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            {displayData?.id ? (
              <div className="flex flex-1 justify-between items-center">
                <span>Lead Details</span>
                <Badge variant="outline" className="ml-2 bg-blue-50">Lead ID: {displayData.id}</Badge>
                {lastUpdateTime && (
                  <Badge variant="outline" className="ml-2 bg-gray-50 text-xs">
                    Updated: {lastUpdateTime.toLocaleTimeString()}
                  </Badge>
                )}
              </div>
            ) : ( 
              'Lead Details - No Lead ID Available'
            )}
            <div className="absolute top-2 right-2 flex space-x-2">
              {process.env.NODE_ENV === 'development' && (
                <Button 
                  onClick={forcePushData}
                  variant="ghost"
                  size="sm"
                  title="Force Push Data (Debug)"
                  disabled={!displayData || isLoading}
                >
                  <Bug className="h-4 w-4" />
                </Button>
              )}
              <Button 
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
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

          {/* Always show raw data for debugging purposes */}
          <div className="mt-4 p-2 bg-gray-100 rounded">
            <details>
              <summary className="cursor-pointer text-sm text-gray-600">Raw Lead Data</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-[300px]">
                {displayData ? JSON.stringify(displayData, null, 2) : "No data available"}
              </pre>
            </details>
          </div>

          {/* Debug info for realtime connections */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-gray-100 rounded">
              <details>
                <summary className="cursor-pointer text-sm text-gray-600">Realtime Debug Info</summary>
                <div className="mt-2 text-xs">
                  <div><strong>Connection Status:</strong> {connectionStatus}</div>
                  <div><strong>Active Channels:</strong> {supabase.getChannels().length}</div>
                  <div><strong>Lead ID:</strong> {currentLeadId}</div>
                  <div><strong>Last Update:</strong> {lastUpdateTime?.toISOString()}</div>
                  <div><strong>Has Data Sources:</strong> {JSON.stringify({
                    initialData: !!initialLeadData,
                    realtimeData: !!realtimeLeadData, 
                    manualData: !!manualLeadData
                  })}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2" 
                    onClick={forcePushData}
                    disabled={!displayData}
                  >
                    Force Push Data
                  </Button>
                </div>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
