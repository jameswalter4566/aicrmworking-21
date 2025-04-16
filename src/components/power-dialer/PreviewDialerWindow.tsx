import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Play,
  Trash2,
  List,
  Loader2
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import LeadSelectionPanel from './LeadSelectionPanel';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import DialerQueueMonitor from './DialerQueueMonitor';

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
  const { user } = useAuth();
  
  useEffect(() => {
    if (isDialingStarted) {
      fetchCallingLists();
    }
  }, [isDialingStarted]);

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
      // Notify parent component or refresh data as needed
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
      
      toast.success("Dialing Session Started", {
        description: `Preparing to dial ${data.totalLeads} leads`
      });
      
      // TODO: Implement next steps for actually starting the dialing process
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

  return (
    <>
      <Card className="bg-gray-800 p-4 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((line) => (
            <Card key={line} className="bg-white">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-600">Line {line}</span>
                  </div>
                  <Badge variant="outline" className="bg-white text-gray-600 border-gray-200">
                    FREE
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4 mt-0">
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                Preview Dialer
              </div>
              {currentCall && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  On Call
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isDialingStarted ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Button 
                  onClick={() => setIsDialingStarted(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-lg rounded-lg flex items-center gap-3"
                >
                  <Play className="h-6 w-6" />
                  Start Dialing
                </Button>
              </div>
            ) : !currentCall ? (
              <div className="space-y-4">
                {sessionId && <DialerQueueMonitor sessionId={sessionId} />}
                
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
                              <Badge className="bg-green-50 text-green-600">
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
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                      {currentCall.parameters.To ? currentCall.parameters.To[0].toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {currentCall.parameters.To || 'Unknown Contact'}
                    </h3>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>Company: {currentCall.parameters.company || 'Unknown'}</p>
                      <p>Phone: {currentCall.parameters.To || 'N/A'}</p>
                      <p>Status: Active Call</p>
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
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-50"
                      onClick={(e) => handleDeleteLead(currentCall?.parameters?.leadId, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Call Notes</h4>
                  <textarea 
                    className="w-full h-20 p-2 border rounded-md text-sm"
                    placeholder="Enter call notes here..."
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                
                <Button 
                  variant="outline" 
                  className="w-full justify-center bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={onEndCall}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Hang Up
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-center bg-red-900/50 hover:bg-red-900 text-white border-red-900"
                >
                  <StopCircle className="mr-2 h-4 w-4 text-red-400" />
                  Stop
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
