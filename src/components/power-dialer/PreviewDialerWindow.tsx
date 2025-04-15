
import React from 'react';
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
  StopCircle 
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

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
  return (
    <>
      <Card className="bg-gray-800 p-4 rounded-lg mb-0">
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

      <div className="grid grid-cols-4 gap-4 mb-4">
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
            {currentCall ? (
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
                  
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={onEndCall}
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Call
                  </Button>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Call Notes</h4>
                  <textarea 
                    className="w-full h-20 p-2 border rounded-md text-sm"
                    placeholder="Enter call notes here..."
                  />
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-gray-500">
                <Phone className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No active call</p>
                <p className="text-sm">Select a contact from the queue below to start dialing</p>
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
