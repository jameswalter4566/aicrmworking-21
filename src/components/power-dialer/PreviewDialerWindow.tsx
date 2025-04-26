
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeadDetailsPanel } from './LeadDetailsPanel';
import { Badge } from "@/components/ui/badge";
import { Phone, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface PreviewDialerWindowProps {
  currentCall: any;
  onDisposition?: (type: string) => void;
  onEndCall?: () => void;
}

const PreviewDialerWindow: React.FC<PreviewDialerWindowProps> = ({
  currentCall,
  onDisposition,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Extract lead data from the current call
  const lead = currentCall?.parameters?.leadId ? 
    { id: currentCall?.parameters?.leadId } : null;

  const callStatus = currentCall?.status || 'not-connected';
  const isConnected = callStatus === 'in-progress';
  const isConnecting = callStatus === 'connecting' || callStatus === 'ringing';

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // You would implement actual mute functionality here
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // You would implement actual speaker toggle functionality here
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Preview Dialer</CardTitle>
        <div className="flex items-center">
          {isConnected && (
            <Badge variant="success" className="mr-2">Connected</Badge>
          )}
          {isConnecting && (
            <Badge variant="warning" className="mr-2">Connecting...</Badge>
          )}
          {!isConnected && !isConnecting && (
            <Badge variant="outline" className="mr-2">Not Connected</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* When a call is connected, show the lead details */}
          <div className={`${isConnected ? 'md:col-span-8' : 'md:col-span-12'}`}>
            {isConnected ? (
              <div className="border rounded-md p-4">
                <LeadDetailsPanel 
                  isActive={true} 
                  currentCall={currentCall} 
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-gray-50">
                <Phone className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Call</h3>
                <p className="text-sm text-gray-500">
                  Select a lead from the list below to place a call.
                </p>
              </div>
            )}
          </div>

          {/* Call controls - only show when connected */}
          {isConnected && (
            <div className="md:col-span-4">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Call Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-around">
                    <Button
                      variant="outline"
                      size="icon"
                      className={`h-12 w-12 rounded-full ${isMuted ? 'bg-red-50 text-red-500' : ''}`}
                      onClick={toggleMute}
                    >
                      {isMuted ? (
                        <MicOff className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={`h-12 w-12 rounded-full ${!isSpeakerOn ? 'bg-red-50 text-red-500' : ''}`}
                      onClick={toggleSpeaker}
                    >
                      {isSpeakerOn ? (
                        <Volume2 className="h-5 w-5" />
                      ) : (
                        <VolumeX className="h-5 w-5" />
                      )}
                    </Button>
                  </div>

                  <Separator />
                  
                  {/* Disposition Buttons */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Disposition Call</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {onDisposition && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="justify-start"
                            onClick={() => onDisposition('Contact')}
                          >
                            <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                            Contact
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="justify-start"
                            onClick={() => onDisposition('No Contact')}
                          >
                            <span className="h-2 w-2 rounded-full bg-gray-500 mr-1"></span>
                            No Contact
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="justify-start"
                            onClick={() => onDisposition('Callback')}
                          >
                            <span className="h-2 w-2 rounded-full bg-blue-500 mr-1"></span>
                            Callback
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="justify-start"
                            onClick={() => onDisposition('Wrong Number')}
                          >
                            <span className="h-2 w-2 rounded-full bg-red-500 mr-1"></span>
                            Wrong #
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* End Call Button */}
                  {onEndCall && (
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={onEndCall}
                    >
                      End Call
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PreviewDialerWindow;
