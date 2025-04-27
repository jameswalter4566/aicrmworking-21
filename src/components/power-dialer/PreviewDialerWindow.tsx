
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mic, MicOff, Volume2, VolumeX, User, Building, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface PreviewDialerWindowProps {
  currentCall: any;
  onDisposition: (type: string) => void;
  onEndCall: () => void;
  onCallNextLead?: () => void; // Added prop for next lead functionality
}

const PreviewDialerWindow: React.FC<PreviewDialerWindowProps> = ({
  currentCall,
  onDisposition,
  onEndCall,
  onCallNextLead
}) => {
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState<string>('00:00');
  const [notes, setNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('disposition');
  
  const isCallActive = useMemo(() => {
    return currentCall && (currentCall.status === 'connecting' || currentCall.status === 'in-progress');
  }, [currentCall]);
  
  useEffect(() => {
    if (currentCall && currentCall.status === 'in-progress' && !callStartTime) {
      setCallStartTime(new Date());
    }
    
    if (!currentCall || (currentCall.status !== 'connecting' && currentCall.status !== 'in-progress')) {
      setCallStartTime(null);
    }
  }, [currentCall, callStartTime]);
  
  useEffect(() => {
    let intervalId: number | null = null;
    
    if (callStartTime) {
      intervalId = window.setInterval(() => {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
        const minutes = Math.floor(diffInSeconds / 60).toString().padStart(2, '0');
        const seconds = (diffInSeconds % 60).toString().padStart(2, '0');
        setCallDuration(`${minutes}:${seconds}`);
      }, 1000);
    } else {
      setCallDuration('00:00');
    }
    
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [callStartTime]);
  
  const handleSaveNotes = useCallback(() => {
    if (notes.trim()) {
      toast.success('Notes saved successfully');
      // Here you would typically save the notes to your backend
      console.log('Saving notes:', notes);
    }
  }, [notes]);

  const handleCallNextLead = useCallback(async () => {
    try {
      // First end current call
      await onEndCall();
      
      // Then trigger next lead call
      if (onCallNextLead) {
        toast.info('Calling next lead...');
        onCallNextLead();
      }
    } catch (err) {
      console.error('Error calling next lead:', err);
      toast.error('Error calling next lead');
    }
  }, [onEndCall, onCallNextLead]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex justify-between items-center">
            Disposition Panel
            <div className="flex gap-2">
              {/* Call Next Lead button - always rendered */}
              <Button 
                onClick={handleCallNextLead}
                variant="default"
                className="bg-green-500 hover:bg-green-600"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Next Lead
              </Button>

              {/* Keep existing buttons */}
              <Button
                variant="destructive"
                onClick={onEndCall}
                className="whitespace-nowrap"
              >
                <Phone className="w-4 h-4 mr-2" />
                End Call
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pb-2">
          {isCallActive ? (
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Badge variant="default" className="animate-pulse">
                    {currentCall.status === 'connecting' ? 'Connecting...' : 'In Call'}
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="w-4 h-4 mr-1" />
                    {callDuration}
                  </Badge>
                </div>
                
                <div className="flex space-x-2">
                  {currentCall.isMuted ? (
                    <Badge variant="destructive">
                      <MicOff className="w-4 h-4 mr-1" />
                      Muted
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Mic className="w-4 h-4 mr-1" />
                      Unmuted
                    </Badge>
                  )}
                  
                  {currentCall.speakerOn ? (
                    <Badge variant="default">
                      <Volume2 className="w-4 h-4 mr-1" />
                      Speaker
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <VolumeX className="w-4 h-4 mr-1" />
                      Earpiece
                    </Badge>
                  )}
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="disposition">Disposition</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </TabsList>
                
                <TabsContent value="disposition" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => onDisposition('interested')}>
                      Interested
                    </Button>
                    <Button onClick={() => onDisposition('not-interested')}>
                      Not Interested
                    </Button>
                    <Button onClick={() => onDisposition('callback')}>
                      Call Back
                    </Button>
                    <Button onClick={() => onDisposition('wrong-number')}>
                      Wrong Number
                    </Button>
                    <Button onClick={() => onDisposition('voicemail')}>
                      Left Voicemail
                    </Button>
                    <Button onClick={() => onDisposition('no-answer')}>
                      No Answer
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="notes" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Call Notes</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="Enter notes about this call..." 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[120px]"
                    />
                    <Button onClick={handleSaveNotes} className="w-full">
                      Save Notes
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="info" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Contact:</span>
                      <span>{currentCall.parameters?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4" />
                      <span className="font-medium">Company:</span>
                      <span>{currentCall.parameters?.company || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">Phone:</span>
                      <span>{currentCall.phoneNumber || 'Unknown'}</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No active call</p>
              <p className="text-sm text-muted-foreground mt-1">
                Select a lead from the queue below to start calling
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PreviewDialerWindow;
