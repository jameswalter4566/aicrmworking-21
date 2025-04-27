import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";
import { NextLeadButton } from './NextLeadButton';

interface PreviewDialerWindowProps {
  currentCall: any;
  onDisposition: (type: string) => void;
  onEndCall: () => void;
  onCallNextLead?: () => void;
  isCallingNext?: boolean;
}

export default function PreviewDialerWindow({
  currentCall,
  onDisposition,
  onEndCall,
  onCallNextLead,
  isCallingNext = false
}: PreviewDialerWindowProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-start">
          <div>Call Controls</div>
          <div className="flex gap-2">
            {currentCall?.status === 'connecting' && (
              <Badge variant="secondary">Ringing</Badge>
            )}
            {currentCall?.status === 'in-progress' && (
              <Badge variant="default">Connected</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {/* Column 1: Main call controls */}
            <div className="space-y-2">
              {currentCall && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={onEndCall}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  End Call
                </Button>
              )}
              
              {/* Redial Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (currentCall) {
                    // Implement redial logic here
                    console.log('Redialing:', currentCall.phoneNumber);
                  }
                }}
              >
                <Phone className="mr-2 h-4 w-4" />
                Redial
              </Button>

              {/* Next Lead Button - Always visible */}
              <NextLeadButton
                onCallNext={onCallNextLead || (() => {})}
                isCallingNext={isCallingNext}
                hasActiveCall={!!currentCall}
              />
            </div>

            {/* Column 2: Disposition buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onDisposition('Interested')}
              >
                Interested
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onDisposition('Not Interested')}
              >
                Not Interested
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onDisposition('Call Back')}
              >
                Call Back
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onDisposition('Left Voicemail')}
              >
                Left Voicemail
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
