
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ConnectedLeadPanel } from './ConnectedLeadPanel';

interface PreviewDialerWindowProps {
  currentCall?: any;
  onDisposition?: (type: string) => void;
  onEndCall?: () => void;
}

const PreviewDialerWindow = ({
  currentCall,
  onDisposition,
  onEndCall,
}: PreviewDialerWindowProps) => {
  const [callingLists, setCallingLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [isDialing, setIsDialing] = useState(false);
  const [connectedLeadData, setConnectedLeadData] = useState<any>(null);

  useEffect(() => {
    // Fetch calling lists when component mounts
    fetchCallingLists();
  }, []);

  // When currentCall changes and is active, update the connected lead data
  useEffect(() => {
    if (currentCall?.status === 'in-progress' && currentCall?.leadId) {
      setConnectedLeadData(null); // Reset before fetching new data
      fetchLeadData(currentCall.leadId);
    } else if (!currentCall || currentCall?.status === 'completed') {
      setIsDialing(false);
    }
  }, [currentCall]);

  const fetchCallingLists = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-calling-lists');

      if (error) throw new Error(error.message);
      if (data && data.lists) {
        setCallingLists(data.lists);
      }
    } catch (err: any) {
      console.error('Error fetching calling lists:', err);
      toast.error('Failed to load calling lists');
    }
  };

  const fetchLeadData = async (leadId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('lead-connected', {
        body: { 
          leadId,
          callData: {
            callSid: currentCall?.callSid,
            status: currentCall?.status,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;
      if (data?.lead) {
        console.log('Lead data fetched:', data.lead);
        setConnectedLeadData(data.lead);
      }
    } catch (err) {
      console.error('Error fetching lead data:', err);
    }
  };

  const handleSelectList = (listId: string) => {
    setSelectedList(listId);
  };

  const startDialingSession = async () => {
    if (!selectedList) {
      toast.error('Please select a calling list first');
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('start-dialing-session', {
        body: {
          listId: selectedList,
          sessionName: `Dialing Session for ${callingLists.find(l => l.id === selectedList)?.name || 'unknown'}`
        }
      });

      if (error) throw error;
      
      if (data?.sessionId) {
        setSessionId(data.sessionId);
        setIsSessionActive(true);
        setSessionStats({
          totalLeads: data.leadCount,
          queued: data.leadCount,
          completed: 0,
          inProgress: 0
        });
        
        toast.success('Dialing session created successfully');
      }
    } catch (err: any) {
      console.error('Error starting dialing session:', err);
      toast.error('Failed to start dialing session');
    } finally {
      setIsLoading(false);
    }
  };

  const startPowerDialing = async () => {
    if (!sessionId) {
      toast.error('No active dialing session');
      return;
    }

    try {
      setIsDialing(true); // Set dialing state to true BEFORE we call the API
      toast('Starting power dialer...', {
        description: 'The system will begin dialing leads from your selected list.'
      });
      
      // This would typically trigger the actual dialing through an API call
      // For now, we just set the state to show we're dialing
      
      // Redirect to the dialer session page
      window.location.href = `/dialer-session?id=${sessionId}`;
    } catch (err) {
      console.error('Error starting power dialer:', err);
      toast.error('Failed to start power dialer');
      setIsDialing(false);
    }
  };

  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Queue Status</h3>
            <button 
              onClick={fetchCallingLists} 
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Refresh"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
              </svg>
            </button>
          </div>
          
          {/* Show warning if there are issues */}
          {sessionStats && sessionStats.queueWarning && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    {sessionStats.queueWarning}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-2xl font-bold text-blue-500">
                {sessionStats?.queued || 0}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Queued
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-2xl font-bold text-orange-500">
                {sessionStats?.inProgress || 0}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <path d="M15 3h6v6"></path>
                  <path d="M10 14L21 3"></path>
                </svg>
                In Progress
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-2xl font-bold text-green-500">
                {sessionStats?.completed || 0}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Completed
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-2xl font-bold text-purple-500">
                {sessionStats?.totalLeads || 0}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="8"></line>
                </svg>
                Total
              </div>
            </div>
          </div>
          
          {/* Dialing Actions */}
          <div className="mt-6 flex justify-center">
            {!isSessionActive ? (
              selectedList && (
                <Button 
                  onClick={startDialingSession} 
                  disabled={isLoading || !selectedList} 
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {isLoading ? 'Creating Session...' : 'Begin Dialing'}
                </Button>
              )
            ) : (
              <Button 
                onClick={startPowerDialing} 
                disabled={isLoading} 
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <Phone className="mr-2 h-4 w-4" />
                Start Power Dialing
              </Button>
            )}
          </div>
          
          {/* Session Status */}
          {isSessionActive && (
            <>
              <div className="mt-6 flex justify-center">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Session Active
                </Badge>
              </div>
              <div className="mt-2 text-center">
                <p className="text-gray-700">Dialing session has been created successfully!</p>
                <p className="text-sm text-gray-500 mt-1">Session ID: {sessionId}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Connected Lead Details */}
      <ConnectedLeadPanel 
        leadData={connectedLeadData}
        isConnected={!!currentCall && currentCall.status === 'in-progress'} 
        isDialing={isDialing}
      />
      
      {/* Calling List Selection */}
      {!isSessionActive && (
        <>
          <h3 className="font-medium mb-2">Select a Calling List</h3>
          <div className="space-y-2">
            {callingLists.map((list) => (
              <div 
                key={list.id} 
                className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedList === list.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => handleSelectList(list.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{list.name}</p>
                    <p className="text-sm text-gray-500">
                      {list.lead_count} leads • Created {new Date(list.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {selectedList === list.id && (
                    <Badge className="ml-2">Selected</Badge>
                  )}
                </div>
              </div>
            ))}
            
            {callingLists.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No calling lists found. Create a calling list to start dialing.
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default PreviewDialerWindow;
