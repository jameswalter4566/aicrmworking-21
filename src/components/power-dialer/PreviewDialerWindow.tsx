import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  UserX, 
  PhoneOff, 
  MessageSquare, 
  Ban, 
  PhoneMissed,
  Clock,
  RotateCcw,
  Pause,
  StopCircle,
  Play
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import LeadSelectionPanel from './LeadSelectionPanel';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import DialerQueueMonitor from './DialerQueueMonitor';
import { AutoDialerController } from './AutoDialerController';
import { twilioService } from "@/services/twilio";
import { LineDisplay } from './LineDisplay';
import { useCallStatus } from '@/hooks/use-call-status';
import { LeadDetailsPanel } from './LeadDetailsPanel';
import DispositionSelector from '@/components/DispositionSelector';
import { leadProfileService } from '@/services/leadProfile';
import { ConnectedLeadPanel } from './ConnectedLeadPanel';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { List, Loader2, Mail, MapPin, Trash2 } from 'lucide-react';
import { HangupButton } from './HangupButton';

interface PreviewDialerWindowProps {
  currentCall: any;
  onDisposition: (type: string) => void;
  onEndCall: () => void;
}

const PreviewDialerWindow: React.FC<PreviewDialerWindowProps> = ({
  currentCall,
  onDisposition,
  onEndCall
}) => {
  const [isDialingStarted, setIsDialingStarted] = useState(false);
  const [callingLists, setCallingLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [autoDialerActive, setAutoDialerActive] = useState(false);
  const [isActivePowerDialing, setIsActivePowerDialing] = useState(false);
  const [isProcessingCall, setIsProcessingCall] = useState(false);
  const [activeCallsInProgress, setActiveCallsInProgress] = useState<Record<string, any>>({});
  const [isDialing, setIsDialing] = useState(false);
  const [forceSkeleton, setForceSkeleton] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const { user } = useAuth();
  const { callStatuses } = useCallStatus();

  const [currentLead, setCurrentLead] = useState<any>(null);
  const [leadNotes, setLeadNotes] = useState<any[]>([]);
  const [callNotes, setCallNotes] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setForceSkeleton(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  const resetDialingState = useCallback(() => {
    if (!currentCall && !isProcessingCall) {
      setIsDialing(false);
    }
  }, [currentCall, isProcessingCall]);

  useEffect(() => {
    const timer = setTimeout(resetDialingState, 1500);
    return () => clearTimeout(timer);
  }, [currentCall, isProcessingCall, resetDialingState]);

  useEffect(() => {
    if (currentCall) {
      setIsDialing(true);
    }
  }, [currentCall]);

  useEffect(() => {
    console.log('Session state update:', { 
      sessionId, 
      autoDialerActive, 
      isActivePowerDialing 
    });
  }, [sessionId, autoDialerActive, isActivePowerDialing]);

  useEffect(() => {
    console.log('Call statuses updated:', callStatuses);
  }, [callStatuses]);

  useEffect(() => {
    const fetchLeadData = async () => {
      if (currentCall?.parameters?.leadId && currentCall.status === 'in-progress') {
        try {
          console.log('Fetching lead data for:', currentCall.parameters.leadId);
          const { data, error } = await supabase.functions.invoke('lead-connected', {
            body: { leadId: currentCall.parameters.leadId }
          });

          if (error) {
            console.error('Error from lead-connected function:', error);
            throw error;
          }

          if (data && data.success) {
            console.log('Lead data received:', data);
            setCurrentLead(data.lead);
            setLeadNotes(data.notes || []);
            setTimeout(() => setIsDialing(false), 500);
          } else {
            console.warn('Lead data response was not successful:', data);
          }
        } catch (err) {
          console.error('Error fetching lead data:', err);
          toast.error('Failed to load lead details');
        }
      }
    };

    fetchLeadData();
  }, [currentCall?.parameters?.leadId, currentCall?.status]);

  const fetchCallingLists = async () => {
    setIsLoadingLists(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-calling-lists');
      
      if (error) {
        console.error("Error fetching calling lists:", error);
        setError("Failed to load calling lists. Please try again.");
        toast.error("Failed to load calling lists");
        return;
      }

      setCallingLists(data || []);
    } catch (error) {
      console.error("Error in fetchCallingLists:", error);
      setError("An unexpected error occurred while loading lists.");
      toast.error("Failed to load calling lists");
    } finally {
      setIsLoadingLists(false);
    }
  };

  useEffect(() => {
    if (isDialingStarted) {
      fetchCallingLists();
    }
  }, [isDialingStarted]);

  const handleDeleteLead = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('delete-lead', {
        body: { leadId }
      });
      
      if (error) {
        console.error("Error deleting lead:", error);
        toast.error("Failed to delete lead");
        return;
      }
      
      toast.success("Lead deleted successfully");
    } catch (error) {
      console.error("Error in handleDeleteLead:", error);
      toast.error("Failed to delete lead");
    }
  };

  const handleBeginDialing = async () => {
    if (!selectedListId) {
      toast.error("Please select a calling list first");
      return;
    }
    
    setIsCreatingSession(true);
    setError(null);
    
    try {
      const selectedList = callingLists.find(list => list.id === selectedListId);
      const sessionName = selectedList ? `Dialing Session for ${selectedList.name}` : undefined;
      
      console.log("Starting dialing session with:", { listId: selectedListId, sessionName });
      
      const { data, error } = await supabase.functions.invoke('start-dialing-session', {
        body: { 
          listId: selectedListId,
          sessionName
        }
      });
      
      if (error) {
        console.error("Error starting dialing session:", error);
        setError("Failed to start dialing session. Please try again.");
        toast.error("Failed to start dialing session", {
          description: error.message || "Unable to begin dialing"
        });
        return;
      }
      
      console.log("Dialing session created successfully:", data);
      setSessionId(data.sessionId);
      setAutoDialerActive(false);
      
      toast.success("Dialing Session Started", {
        description: `Preparing to dial ${data.totalLeads} leads`
      });
    } catch (error) {
      console.error("Unexpected error in handleBeginDialing:", error);
      setError("An unexpected error occurred. Please try again later.");
      toast.error("Failed to start dialing session", {
        description: "An unexpected error occurred"
      });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleStartPowerDialing = async () => {
    if (!sessionId) {
      toast.error("No active session found");
      return;
    }

    try {
      setIsDialing(true); 
      setForceSkeleton(true);
      setIsProcessingCall(true);
      await twilioService.initializeTwilioDevice();
      setAutoDialerActive(true);
      setIsActivePowerDialing(true);
      
      toast.success("Power dialing sequence started", {
        description: "The system will now automatically dial leads in queue"
      });
      
      setTimeout(() => {
        setForceSkeleton(false);
      }, 1500);
    } catch (error) {
      console.error("Error starting power dialing:", error);
      toast.error("Failed to start power dialing");
      setAutoDialerActive(false);
      setIsActivePowerDialing(false);
      setIsDialing(false);
      setForceSkeleton(false);
    } finally {
      setIsProcessingCall(false);
    }
  };

  const handleCallComplete = useCallback(() => {
    console.log('Call completed, ready for next call');
  }, []);

  const handleCallNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCallNotes(e.target.value);
  };
  
  const saveCallNotes = async () => {
    if (!currentLead?.id || !callNotes.trim()) return;
    
    try {
      const noteData = {
        lead_id: currentLead.id,
        content: callNotes,
        created_by: user?.email || 'System'
      };
      
      const { data, error } = await supabase
        .from('lead_notes')
        .insert(noteData);
      
      if (error) throw error;
      
      toast.success('Call notes saved successfully');
      setCallNotes('');
      
      const { data: refreshedNotes } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', currentLead.id)
        .order('created_at', { ascending: false });
        
      if (refreshedNotes) {
        setLeadNotes(refreshedNotes);
      }
    } catch (err) {
      console.error('Error saving call notes:', err);
      toast.error('Failed to save call notes');
    }
  };

  const activeCallsForDisplay = React.useMemo(() => {
    const displayCalls: Record<number, any> = {};
    
    if (currentCall) {
      displayCalls[1] = {
        phoneNumber: currentCall.parameters?.To || 'Unknown',
        leadName: 'Current Call',
        status: currentCall.status || 'connecting',
        startTime: currentCall.status === 'in-progress' ? new Date() : undefined
      };
    }
    
    Object.entries(callStatuses).forEach(([leadId, callStatus], index) => {
      const lineNumber = Object.keys(displayCalls).length + 1;
      
      if (lineNumber <= 3) {
        displayCalls[lineNumber] = callStatus;
      }
    });
    
    return displayCalls;
  }, [currentCall, callStatuses]);

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
    }
    return phone;
  };

  useEffect(() => {
    if (sessionId) {
      setSessionActive(true);
    }
  }, [sessionId]);

  return (
    <>
      <Card className="bg-gray-800 p-4 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((line) => (
            <LineDisplay 
              key={line} 
              lineNumber={line}
              currentCall={activeCallsForDisplay[line]}
            />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="col-span-3">
          {!isDialingStarted ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-green-500" />
                    Preview Dialer
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <Button 
                    onClick={() => setIsDialingStarted(true)}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-lg rounded-lg flex items-center gap-3"
                  >
                    <Play className="h-6 w-6" />
                    Start Dialing
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : currentCall && currentCall.status === 'in-progress' ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-green-500" />
                    Active Call
                  </div>
                  <Badge>In Progress</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                        {currentLead?.first_name ? currentLead.first_name[0] : '?'}
                        {currentLead?.last_name ? currentLead.last_name[0] : ''}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">
                        {currentLead ? `${currentLead.first_name} ${currentLead.last_name}` : 'Loading contact...'}
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {currentLead?.phone1 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {formatPhoneNumber(currentLead.phone1)}
                          </div>
                        )}
                        
                        {currentLead?.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {currentLead.email}
                          </div>
                        )}
                        
                        {currentLead?.property_address && (
                          <div className="flex items-start gap-2 text-sm text-gray-600 col-span-2">
                            <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                            <span>{currentLead.property_address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={onEndCall}
                      >
                        <PhoneOff className="h-4 w-4 mr-2" />
                        End Call
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Call Notes</h4>
                      <textarea 
                        className="w-full h-32 p-2 border rounded-md text-sm"
                        placeholder="Enter call notes here..."
                        value={callNotes}
                        onChange={handleCallNotesChange}
                      />
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={saveCallNotes}
                        disabled={!callNotes.trim()}
                      >
                        Save Notes
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium flex justify-between items-center">
                        <span>Existing Notes</span>
                        <Badge variant="outline" className="text-xs">
                          {leadNotes.length}
                        </Badge>
                      </h4>
                      <ScrollArea className="h-40 border rounded-md p-2">
                        {leadNotes.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No notes available</p>
                        ) : (
                          <div className="space-y-2">
                            {leadNotes.map((note, index) => (
                              <div key={note.id || index} className="text-sm p-2 bg-gray-50 rounded">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>{note.created_by || 'System'}</span>
                                  <span>{new Date(note.created_at).toLocaleString()}</span>
                                </div>
                                <p>{note.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                  
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-medium mb-2">Lead Disposition</h4>
                    <DispositionSelector 
                      currentDisposition={currentLead?.disposition || 'Not Contacted'} 
                      onDispositionChange={(disposition) => {
                        if (currentLead?.id) {
                          leadProfileService.updateDisposition(currentLead.id, disposition)
                            .then(() => {
                              setCurrentLead({...currentLead, disposition});
                              toast.success(`Disposition updated to ${disposition}`);
                            })
                            .catch(err => {
                              console.error('Error updating disposition:', err);
                              toast.error('Failed to update disposition');
                            });
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-green-500" />
                    Preview Dialer
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessionId && (
                    <>
                      <DialerQueueMonitor sessionId={sessionId} />
                      
                      {!autoDialerActive && (
                        <div className="flex justify-center my-4">
                          <Button
                            onClick={handleStartPowerDialing}
                            className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg rounded-lg flex items-center gap-3"
                            disabled={isCreatingSession || isProcessingCall}
                          >
                            {isProcessingCall ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Phone className="h-5 w-5" />
                            )}
                            Start Power Dialing
                          </Button>
                        </div>
                      )}

                      <AutoDialerController 
                        sessionId={sessionId}
                        isActive={autoDialerActive}
                        onCallComplete={handleCallComplete}
                      />
                      
                      <ConnectedLeadPanel 
                        leadData={currentLead}
                      />
                    </>
                  )}
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  {sessionId ? (
                    <div className="text-center py-6">
                      <Badge className="mb-4 bg-green-100 text-green-800 py-2 px-4 text-sm">
                        Session Active
                      </Badge>
                      <p className="text-lg font-medium">Dialing session has been created successfully!</p>
                      <p className="text-sm text-gray-500 mt-2">Session ID: {sessionId}</p>
                    </div>
                  ) : selectedListId && (
                    <div className="mb-4 flex justify-center">
                      <Button 
                        onClick={handleBeginDialing}
                        className="bg-crm-blue hover:bg-crm-blue/90 text-white px-8 py-4 text-lg rounded-lg flex items-center gap-3"
                        disabled={isCreatingSession}
                      >
                        {isCreatingSession ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Phone className="h-5 w-5" />
                        )}
                        {isCreatingSession ? 'Creating Session...' : 'Begin Dialing'}
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Select a Calling List</h3>
                    {selectedListId && !sessionId && (
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedListId(null)}
                        className="text-sm"
                        disabled={isCreatingSession}
                      >
                        Change List
                      </Button>
                    )}
                  </div>
                  
                  {isLoadingLists ? (
                    <div className="text-center py-8 text-gray-500">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                      Loading calling lists...
                    </div>
                  ) : callingLists.length === 0 ? (
                    <div className="text-center py-8">
                      <List className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">No calling lists found.</p>
                      <p className="text-sm text-gray-400">Create a calling list first to start dialing.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {callingLists.map((list) => (
                        <Card 
                          key={list.id}
                          className={`
                            cursor-pointer transition-all
                            ${selectedListId === list.id ? 'ring-2 ring-green-500' : 'hover:bg-gray-50'}
                          `}
                          onClick={() => !sessionId && setSelectedListId(list.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{list.name}</h4>
                                <p className="text-sm text-gray-500">
                                  {list.leadCount} leads • Created {new Date(list.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              {selectedListId === list.id && (
                                <Badge variant="outline">
                                  Selected
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  {selectedListId && !sessionId && (
                    <div className="mt-6 space-y-4">
                      <LeadSelectionPanel 
                        listId={selectedListId}
                        onLeadsSelected={(leads) => {
                          console.log('Selected leads:', leads);
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="bg-gray-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-white">Disposition</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-650px)]">
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600" 
                  onClick={() => onDisposition('contact')}
                >
                  <Phone className="mr-2 h-4 w-4 text-green-400" />
                  Contact
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('no-contact')}
                >
                  <UserX className="mr-2 h-4 w-4 text-gray-400" />
                  No Contact
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('bad-number')}
                >
                  <PhoneMissed className="mr-2 h-4 w-4 text-red-400" />
                  Bad Number
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('drop-message')}
                >
                  <MessageSquare className="mr-2 h-4 w-4 text-blue-400" />
                  Drop Message
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('dnc-contact')}
                >
                  <Ban className="mr-2 h-4 w-4 text-yellow-400" />
                  DNC Contact
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('dnc-number')}
                >
                  <PhoneOff className="mr-2 h-4 w-4 text-orange-400" />
                  DNC Number
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('callback')}
                >
                  <Clock className="mr-2 h-4 w-4 text-purple-400" />
                  Quick Callback
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('redial')}
                >
                  <RotateCcw className="mr-2 h-4 w-4 text-indigo-400" />
                  Redial
                </Button>
              </div>
              
              <div className="pt-4 border-t border-gray-600 mt-4 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-center bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
                
                <HangupButton
                  callSid={currentCall?.callSid}
                  onSuccess={onEndCall}
                  className="w-full justify-center bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                />
                
                <Button 
                  variant="outline" 
                  className="w-full justify-center bg-red-900/50 hover:bg-red-900 text-white border-red-900"
                >
                  <StopCircle className="mr-2 h-4 w-4 text-red-400" />
                  Stop
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-center bg-green-900/50 hover:bg-green-900 text-white border-green-900"
                >
                  <Phone className="mr-2 h-4 w-4 text-green-400" />
                  Call Next Lead
                </Button>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PreviewDialerWindow;
