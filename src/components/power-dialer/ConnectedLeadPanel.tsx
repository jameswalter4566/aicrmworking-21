
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Bug, AlertCircle, Brain, MessageCircle } from "lucide-react";
import { useLeadRealtime } from '@/hooks/use-lead-realtime';
import { useAuth } from '@/hooks/use-auth';
import { LeadFoundIndicator } from '@/components/LeadFoundIndicator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock transcription data for the real-time rebuttals feature
const mockTranscriptions = [
  { id: 1, text: "Hi, I'm calling about the property listing.", speaker: "caller", timestamp: "00:05" },
  { id: 2, text: "I saw it online and wanted to know if it's still available.", speaker: "caller", timestamp: "00:10" },
  { id: 3, text: "Do you know the square footage and the year it was built?", speaker: "caller", timestamp: "00:15" }
];

// Mock AI suggestions
const mockSuggestions = [
  "Yes, the property is still available as of today",
  "The square footage is 2,450 and it was built in 2005",
  "Would you like to schedule a viewing this week?",
  "Are you currently working with a real estate agent?"
];

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
  const [callState, setCallState] = useState<string>('unknown');
  
  // Real-time rebuttals state
  const [enableRealTimeRebuttals, setEnableRealTimeRebuttals] = useState(false);
  const [currentTranscriptionIndex, setCurrentTranscriptionIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { 
    leadData: realtimeLeadData, 
    isLoading: isRealtimeLoading, 
    leadFound, 
    refresh, 
    lastUpdateTime, 
    lastError,
    broadcastData
  } = useLeadRealtime(currentLeadId, user?.id);

  // Mock real-time transcription effect
  useEffect(() => {
    if (!enableRealTimeRebuttals) return;

    const transcriptionInterval = setInterval(() => {
      if (currentTranscriptionIndex < mockTranscriptions.length) {
        setCurrentTranscriptionIndex(prev => prev + 1);
        setIsThinking(true);
        
        // Show AI thinking for a moment, then show suggestions
        setTimeout(() => {
          setIsThinking(false);
          setShowSuggestions(true);
        }, 1500);
      } else {
        clearInterval(transcriptionInterval);
      }
    }, 4000);

    return () => clearInterval(transcriptionInterval);
  }, [enableRealTimeRebuttals, currentTranscriptionIndex]);
  
  // Reset state when toggling real-time rebuttals off
  useEffect(() => {
    if (!enableRealTimeRebuttals) {
      setCurrentTranscriptionIndex(0);
      setShowSuggestions(false);
      setIsThinking(false);
    }
  }, [enableRealTimeRebuttals]);
  
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

  useEffect(() => {
    const channel = supabase
      .channel('global-leads')
      .on('broadcast', { event: 'lead_data_update' }, (payload) => {
        console.log('[ConnectedLeadPanel] Received global broadcast lead data:', payload);
        if (payload.payload?.lead && 
            (!currentLeadId || payload.payload.lead.id === currentLeadId)) {
          setManualLeadData(payload.payload.lead);
          setCallState(payload.payload.callState || 'unknown');
          setLocalLeadFound(true);
          setTimeout(() => setLocalLeadFound(false), 3000);
        }
      })
      .subscribe((status) => {
        console.log('[ConnectedLeadPanel] Global channel subscription status:', status);
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentLeadId]);

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
        setManualLeadData(data.lead);
        setLocalLeadFound(true);
        setTimeout(() => setLocalLeadFound(false), 3000);
        toast.success('Lead data refreshed successfully');
        
        if (broadcastData) {
          await broadcastData(data.lead);
        }
      } else {
        toast.error('No lead data in response');
      }

      if (onRefresh) onRefresh();
      if (refresh) refresh();
      
    } catch (err) {
      console.error('Error in manual refresh:', err);
      toast.error('Error refreshing lead data');
    } finally {
      setIsLoading(false);
    }
  };

  const forcePushData = async () => {
    if (!currentLeadId || !displayData) return;
    
    try {
      console.log('[ConnectedLeadPanel] Force pushing data to channel');
      
      if (broadcastData) {
        await broadcastData(displayData);
      } else {
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

  const showLeadFound = leadFound || localLeadFound;
  
  const shouldShowLeadData = callState === 'connected' || 
                           callState === 'unknown' || 
                           displayData?.id === initialLeadData?.id;

  return (
    <>
      <LeadFoundIndicator isVisible={showLeadFound} />
      
      {/* Real-time Rebuttals Control */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-between">
        <div className="flex items-center">
          <Brain className="h-6 w-6 text-blue-600 mr-3" />
          <span className="text-lg font-medium text-gray-800">Enable Real-time Rebuttals</span>
        </div>
        <Switch 
          checked={enableRealTimeRebuttals}
          onCheckedChange={setEnableRealTimeRebuttals}
          colorScheme="purple"
          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600"
        />
      </div>
      
      {/* Real-time transcription panel */}
      <AnimatePresence>
        {enableRealTimeRebuttals && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 overflow-hidden"
          >
            <Card className="bg-gradient-to-r from-gray-50 to-blue-50 shadow-sm border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <MessageCircle className="h-4 w-4 text-blue-500 mr-2" />
                  Live Conversation
                  <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
                    Real-time
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {mockTranscriptions.slice(0, currentTranscriptionIndex).map((item) => (
                      <div key={item.id} className="p-2 bg-white rounded-md shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-blue-700">Caller</span>
                          <span className="text-xs text-gray-500">{item.timestamp}</span>
                        </div>
                        <p className="text-sm">{item.text}</p>
                      </div>
                    ))}
                    
                    {/* AI Thinking Indicator */}
                    {isThinking && (
                      <div className="p-2">
                        <div className="flex items-center">
                          <Brain className="h-4 w-4 text-purple-500 mr-2 animate-pulse" />
                          <span className="text-xs text-purple-600">AI analyzing conversation...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                {/* AI Suggestions */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3 border-t border-blue-100"
                    >
                      <div className="mb-2">
                        <span className="text-xs font-medium text-purple-700 flex items-center">
                          <Brain className="h-3 w-3 mr-1" /> Suggested Responses
                        </span>
                      </div>
                      <ScrollArea className="h-[100px]">
                        <div className="space-y-2">
                          {mockSuggestions.map((suggestion, idx) => (
                            <div 
                              key={idx} 
                              className="p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-md text-sm cursor-pointer hover:bg-blue-100 transition-colors"
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {connectionStatus !== 'connected' && (
        <Alert variant="destructive" className="mb-4">
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
            {callState !== 'unknown' && (
              <Badge variant={
                callState === 'connected' ? 'default' :
                callState === 'disconnected' ? 'destructive' :
                callState === 'dialing' ? 'outline' : 'secondary'
              }>
                {callState.charAt(0).toUpperCase() + callState.slice(1)}
              </Badge>
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
          {shouldShowLeadData ? (
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
              <p className="text-muted-foreground">
                {callState === 'dialing' ? 'Dialing...' :
                 callState === 'disconnected' ? 'Call ended' :
                 'Waiting for call to connect...'}
              </p>
            </div>
          )}

          <div className="mt-4 p-2 bg-gray-100 rounded">
            <details>
              <summary className="cursor-pointer text-sm text-gray-600">Raw Lead Data</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-[300px]">
                {displayData ? JSON.stringify(displayData, null, 2) : "No data available"}
              </pre>
            </details>
          </div>

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
