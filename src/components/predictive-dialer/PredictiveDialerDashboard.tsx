
import React, { useState, useEffect, useCallback } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { useAuth } from '@/context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import PredictiveDialerContactsList from './PredictiveDialerContactsList';
import PredictiveDialerQueueMonitor from './PredictiveDialerQueueMonitor';
import TwilioDeviceSetup from './TwilioDeviceSetup';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play, Pause, PhoneOutgoing, Phone, PhoneOff, Users, 
  BarChart, Clock, MessageSquare
} from 'lucide-react';
import { predictiveDialer } from '@/utils/supabase-custom-client';
import { supabase } from "@/integrations/supabase/client";
import { PredictiveDialerAgent, PredictiveDialerContact, PredictiveDialerCall, PredictiveDialerStats } from '@/types/predictive-dialer';
import { ThoughtlyContact } from '@/services/thoughtly';

export const PredictiveDialerDashboard: React.FC = () => {
  const [isDialerRunning, setIsDialerRunning] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<PredictiveDialerAgent | null>(null);
  const [dialeRatio, setDialerRatio] = useState(3); // Calls per available agent
  const [stats, setStats] = useState<PredictiveDialerStats>({
    totalCalls: 0,
    activeCalls: 0,
    callsInQueue: 0,
    availableAgents: 0,
    completedCalls: 0,
    humanAnswers: 0,
    machineAnswers: 0,
    averageWaitTime: 0
  });
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [twilioDevice, setTwilioDevice] = useState<Device | null>(null);
  const [retrievedContacts, setRetrievedContacts] = useState<ThoughtlyContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Handle Twilio device ready
  const handleDeviceReady = useCallback((device: Device) => {
    setTwilioDevice(device);
    
    // Set up incoming call handler
    device.on('incoming', (call) => {
      setCurrentCall(call);
      
      toast({
        title: "Incoming Call",
        description: `Incoming call from ${call.parameters.From}`,
      });
      
      // Auto-accept the call
      call.accept();
      
      call.on('disconnect', () => {
        setCurrentCall(null);
      });
    });
  }, [toast]);

  // Ensure the current user is registered as an agent
  const ensureAgentExists = useCallback(async () => {
    if (!user) return null;
    
    try {
      // Check if agent already exists for this user
      const { data: existingAgents, error: searchError } = await predictiveDialer.getAgents()
        .select('*')
        .eq('user_id', user.id);
        
      if (searchError) throw searchError;
      
      let agent: PredictiveDialerAgent | null = null;
      
      if (existingAgents && existingAgents.length > 0) {
        // Update existing agent
        agent = existingAgents[0];
        const { error: updateError } = await predictiveDialer.getAgents()
          .update({ 
            status: 'available',
            last_status_change: new Date().toISOString() 
          })
          .eq('id', agent.id);
          
        if (updateError) throw updateError;
        
        agent.status = 'available';
      } else {
        // Create new agent
        const { data: newAgent, error: insertError } = await predictiveDialer.getAgents()
          .insert({
            user_id: user.id,
            name: user.email || 'Agent',
            status: 'available',
            last_status_change: new Date().toISOString()
          })
          .select()
          .single();
          
        if (insertError || !newAgent) throw insertError;
        
        agent = newAgent;
      }
      
      setCurrentAgent(agent);
      return agent;
    } catch (error) {
      console.error("Error ensuring agent exists:", error);
      toast({
        title: "Agent Setup Error",
        description: "Failed to set up your agent profile. Some features may not work correctly.",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast]);

  useEffect(() => {
    ensureAgentExists();
    fetchStats();
    fetchContacts();
    
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [ensureAgentExists]);

  const fetchStats = async () => {
    try {
      const { data: activeCalls, error: activeCallsError } = await predictiveDialer.getCalls()
        .select('*')
        .eq('status', 'in_progress');
        
      if (activeCallsError) throw activeCallsError;
      
      const { data: availableAgents, error: agentsError } = await predictiveDialer.getAgents()
        .select('*')
        .eq('status', 'available');
        
      if (agentsError) throw agentsError;
      
      const { data: queueItems, error: queueError } = await predictiveDialer.getCallQueue()
        .select('*');
        
      if (queueError) throw queueError;
      
      const { data: completedCalls, error: completedCallsError } = await predictiveDialer.getCalls()
        .select('*')
        .eq('status', 'completed');
        
      if (completedCallsError) throw completedCallsError;
      
      const { data: humanAnswers, error: humanAnswersError } = await predictiveDialer.getCalls()
        .select('*')
        .eq('machine_detection_result', 'human');
        
      if (humanAnswersError) throw humanAnswersError;
      
      const { data: machineAnswers, error: machineAnswersError } = await predictiveDialer.getCalls()
        .select('*')
        .eq('machine_detection_result', 'machine');
        
      if (machineAnswersError) throw machineAnswersError;
      
      let avgWaitTime = 0;
      if (queueItems && queueItems.length > 0) {
        const now = new Date();
        const totalWaitTime = queueItems.reduce((sum, item) => {
          if (!item.created_timestamp) return sum;
          const created = new Date(item.created_timestamp);
          return sum + (now.getTime() - created.getTime());
        }, 0);
        avgWaitTime = totalWaitTime / queueItems.length / 1000 / 60;
      }
      
      setStats({
        totalCalls: (activeCalls?.length || 0) + (completedCalls?.length || 0),
        activeCalls: activeCalls?.length || 0,
        callsInQueue: queueItems?.length || 0,
        availableAgents: availableAgents?.length || 0,
        completedCalls: completedCalls?.length || 0,
        humanAnswers: humanAnswers?.length || 0,
        machineAnswers: machineAnswers?.length || 0,
        averageWaitTime: parseFloat(avgWaitTime.toFixed(1))
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchContacts = async () => {
    setIsLoadingContacts(true);
    try {
      // Get authentication token
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      
      let headers = {};
      if (authToken) {
        headers = {
          Authorization: `Bearer ${authToken}`
        };
      }
      
      // Call the retrieve-contacts function
      const { data, error } = await supabase.functions.invoke('retrieve-leads', {
        body: { source: 'all' },
        headers
      });
      
      if (error) {
        console.error("Error retrieving contacts:", error);
        throw error;
      }
      
      if (data?.data) {
        setRetrievedContacts(data.data);
        
        // Import contacts to predictive dialer if needed
        for (const contact of data.data) {
          if (contact.phone1) {
            // Check if contact already exists in the dialer by phone number
            const { data: existingContacts, error: searchError } = await predictiveDialer.getContacts()
              .select('*')
              .eq('phone_number', contact.phone1);
              
            if (searchError) {
              console.error("Error searching for existing contact:", searchError);
              continue;
            }
            
            if (!existingContacts || existingContacts.length === 0) {
              // Add to predictive dialer contacts
              await predictiveDialer.getContacts().insert({
                name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
                phone_number: contact.phone1,
                status: 'not_contacted',
                notes: contact.disposition || ''
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const toggleDialer = async () => {
    setIsDialerRunning(!isDialerRunning);
    
    if (!isDialerRunning) {
      // Make sure we have an agent
      const agent = currentAgent || await ensureAgentExists();
      
      if (!agent) {
        toast({
          title: "Agent Required",
          description: "Unable to set up your agent profile. Please try again.",
          variant: "destructive",
        });
        setIsDialerRunning(false);
        return;
      }
      
      try {
        // Update agent status to available if needed
        if (agent.status !== 'available') {
          const { error } = await predictiveDialer.getAgents()
            .update({ status: 'available' })
            .eq('id', agent.id);
          
          if (error) throw error;
          
          setCurrentAgent({...agent, status: 'available'});
        }
        
        // Start the dialer
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/dialer-start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: agent.id,
            maxConcurrentCalls: dialeRatio
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to start dialer');
        }
        
        toast({
          title: "Dialer Started",
          description: `Predictive dialer is now running with a ratio of ${dialeRatio}:1.`,
        });
      } catch (error) {
        console.error("Error starting dialer:", error);
        toast({
          title: "Error",
          description: "Failed to start the predictive dialer.",
          variant: "destructive",
        });
        setIsDialerRunning(false);
      }
    } else {
      try {
        // Stop the dialer
        const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/stop-predictive-dialer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: currentAgent?.id
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to stop dialer');
        }
        
        toast({
          title: "Dialer Stopped",
          description: "Predictive dialer has been stopped.",
        });
      } catch (error) {
        console.error("Error stopping dialer:", error);
        toast({
          title: "Error",
          description: "Failed to stop the predictive dialer.",
          variant: "destructive",
        });
        setIsDialerRunning(true);
      }
    }
  };

  const handleContactSelect = async (contact: PredictiveDialerContact | ThoughtlyContact) => {
    if (!twilioDevice) {
      toast({
        title: "Phone Not Ready",
        description: "The phone system is not ready yet. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    const agent = currentAgent || await ensureAgentExists();
    if (!agent) {
      toast({
        title: "Agent Required",
        description: "Unable to set up your agent profile. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentCall) {
      toast({
        title: "Call In Progress",
        description: "Please end your current call before making a new one.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Update agent status to busy
      const { error: agentError } = await predictiveDialer.getAgents()
        .update({ status: 'busy' })
        .eq('id', agent.id);
      
      if (agentError) throw agentError;
      
      // Get phone number from either type of contact
      const phoneNumber = 'phone_number' in contact 
        ? contact.phone_number 
        : (contact.phone1 || '');
        
      const contactName = 'name' in contact 
        ? contact.name 
        : `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown';
      
      if (!phoneNumber) {
        throw new Error("No phone number available for this contact");
      }

      // For retrieved contacts that aren't in the dialer yet, add them
      let contactId = 'id' in contact ? contact.id : '';
      
      if (!('phone_number' in contact)) {
        // This is a ThoughtlyContact, check if it exists in predictive_dialer_contacts
        const { data: existingContacts, error: searchError } = await predictiveDialer.getContacts()
          .select('*')
          .eq('phone_number', phoneNumber);
          
        if (searchError) throw searchError;
        
        if (!existingContacts || existingContacts.length === 0) {
          // Add to predictive dialer contacts
          const { data: newContact, error: insertError } = await predictiveDialer.getContacts()
            .insert({
              name: contactName,
              phone_number: phoneNumber,
              status: 'not_contacted',
              notes: 'disposition' in contact ? (contact.disposition || '') : ''
            })
            .select()
            .single();
            
          if (insertError || !newContact) throw insertError;
          
          contactId = newContact.id;
        } else {
          contactId = existingContacts[0].id;
        }
      }
      
      // Create call record
      const newCall = {
        contact_id: contactId,
        agent_id: agent.id,
        status: 'in_progress',
        start_timestamp: new Date().toISOString()
      };
      
      const { data: callData, error: callError } = await predictiveDialer.getCalls().insert([newCall]).select();
      
      if (callError || !callData || callData.length === 0) throw new Error("Failed to create call record");
      
      // Update agent with current call
      const { error: updateError } = await predictiveDialer.getAgents()
        .update({ current_call_id: callData[0].id })
        .eq('id', agent.id);
      
      if (updateError) throw updateError;
      
      setCurrentAgent({
        ...agent,
        status: 'busy',
        current_call_id: callData[0].id
      });
      
      // Make the call using Twilio Device
      const call = await twilioDevice.connect({
        params: {
          To: phoneNumber
        }
      });
      
      setCurrentCall(call);
      
      // Handle call events
      call.on('disconnect', () => {
        setCurrentCall(null);
        
        // Update call record and agent status
        predictiveDialer.getCalls()
          .update({
            status: 'completed',
            end_timestamp: new Date().toISOString()
          })
          .eq('id', callData[0].id)
          .then(() => {
            // Reset agent status
            return predictiveDialer.getAgents()
              .update({
                status: 'available',
                current_call_id: null
              })
              .eq('id', agent.id);
          })
          .then(() => {
            setCurrentAgent({
              ...agent,
              status: 'available',
              current_call_id: null
            });
          })
          .catch(error => {
            console.error("Error updating call status:", error);
          });
      });
      
      toast({
        title: "Call Initiated",
        description: `Calling ${contactName}...`,
      });
    } catch (error) {
      console.error("Error initiating call:", error);
      
      try {
        // Reset agent status
        await predictiveDialer.getAgents()
          .update({ status: 'available', current_call_id: null })
          .eq('id', agent.id);
          
        setCurrentAgent({
          ...agent,
          status: 'available',
          current_call_id: null
        });
      } catch (resetError) {
        console.error("Failed to reset agent status:", resetError);
      }
      
      toast({
        title: "Call Failed",
        description: "Failed to initiate the call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEndCall = () => {
    if (currentCall) {
      currentCall.disconnect();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Predictive Dialer</h1>
          <p className="text-gray-500">Automated outbound calling with machine detection</p>
        </div>
        
        <div className="flex items-center gap-2">
          <TwilioDeviceSetup onDeviceReady={handleDeviceReady} />
          
          <Button
            onClick={toggleDialer}
            className={isDialerRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
          >
            {isDialerRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Stop Dialer
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Dialer
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Active call display */}
      {currentCall && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600 animate-pulse" />
                <div>
                  <p className="font-medium">Active Call</p>
                  <p className="text-sm text-gray-600">
                    {currentCall.parameters.To || "Unknown number"}
                  </p>
                </div>
              </div>
              <Button 
                variant="destructive"
                size="sm"
                onClick={handleEndCall}
              >
                <PhoneOff className="mr-2 h-4 w-4" />
                End Call
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Calls</p>
              <p className="text-2xl font-bold">{stats.activeCalls}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Available Agents</p>
              <p className="text-2xl font-bold">{stats.availableAgents}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Calls in Queue</p>
              <p className="text-2xl font-bold">{stats.callsInQueue}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed Calls</p>
              <p className="text-2xl font-bold">{stats.completedCalls}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <PhoneOff className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <PredictiveDialerQueueMonitor 
            currentAgentId={currentAgent?.id}
          />
        </div>
        
        <div>
          <PredictiveDialerContactsList 
            onContactSelect={handleContactSelect} 
          />
        </div>
      </div>
      
      {/* Retrieved contacts section */}
      <div className="mt-6">
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex justify-between items-center">
              <div>Retrieved Contacts</div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={fetchContacts}
                  disabled={isLoadingContacts}
                >
                  {isLoadingContacts ? "Loading..." : "Refresh Contacts"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {retrievedContacts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No contacts retrieved yet.</p>
                <p className="text-sm">Click Refresh Contacts to fetch contacts from your system.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {retrievedContacts.map((contact, index) => (
                  <div 
                    key={`${contact.id || index}`} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {contact.firstName} {contact.lastName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {contact.phone1 || contact.phone2 || "No phone number"}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-100"
                        onClick={() => contact.phone1 && handleContactSelect(contact)}
                        disabled={!contact.phone1 || !!currentCall}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PredictiveDialerDashboard;
