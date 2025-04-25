
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Timer } from 'lucide-react';
import { useTwilio } from '@/hooks/use-twilio';

interface LineDisplayProps {
  lineNumber: number;
  currentCall?: {
    phoneNumber?: string;
    leadName?: string;
    status?: 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
    startTime?: Date;
    company?: string;
  };
}

export const LineDisplay = ({ lineNumber, currentCall }: LineDisplayProps) => {
  const [callDuration, setCallDuration] = useState(0);
  const { activeCalls } = useTwilio();
  
  // Add debugging logs to trace prop changes
  console.log(`LineDisplay Render - Input Props:`, { lineNumber, currentCall });

  // Get active call from Twilio activeCalls if not provided as props
  const callData = React.useMemo(() => {
    if (currentCall && currentCall.status) {
      return currentCall;
    }
    
    // If no currentCall was provided but we have activeCalls, find the call for this line
    if (activeCalls && Object.keys(activeCalls).length > 0) {
      // Get an array of active calls
      const callsArray = Object.values(activeCalls);
      
      // If we have a call for this line (by index), use it
      if (callsArray.length >= lineNumber) {
        const callForLine = callsArray[lineNumber - 1];
        if (callForLine) {
          console.log(`Found active call for line ${lineNumber}:`, callForLine);
          return {
            phoneNumber: callForLine.phoneNumber,
            status: callForLine.status,
            startTime: new Date(),
            leadName: `Lead ${callForLine.leadId || 'Unknown'}`,
          };
        }
      }
    }
    
    return undefined;
  }, [currentCall, activeCalls, lineNumber]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (callData?.status === 'in-progress' && callData?.startTime) {
      // Start timer for in-progress calls
      interval = setInterval(() => {
        const duration = Math.floor((new Date().getTime() - callData.startTime!.getTime()) / 1000);
        setCallDuration(duration);
      }, 1000);
      
      console.log(`Starting timer for line ${lineNumber} with call`, callData);
    } else {
      setCallDuration(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callData?.status, callData?.startTime, lineNumber]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = () => {
    console.log(`LineDisplay getStatusDisplay - Calculating status for: ${callData?.status}`);
    
    if (!callData?.status) {
      console.log(`No current call or phone number - displaying FREE state`);
      return { bg: 'bg-white', text: 'FREE', badge: 'bg-gray-100 text-gray-500' };
    }
    
    switch (callData.status) {
      case 'connecting':
      case 'ringing':
        console.log(`Call in ${callData.status} state for line ${lineNumber}`);
        return { 
          bg: 'bg-green-100/50',
          text: `Dialing ${callData.leadName || callData.phoneNumber || 'unknown'}`,
          badge: 'bg-green-100 text-green-800'
        };
      case 'in-progress':
        console.log(`Call in progress for line ${lineNumber}, duration: ${formatDuration(callDuration)}`);
        return {
          bg: 'bg-green-500/90',
          text: `Connected ${formatDuration(callDuration)}`,
          badge: 'bg-green-500 text-white'
        };
      case 'completed':
      case 'failed':
      case 'busy':
      case 'no-answer':
        console.log(`Call ended with status ${callData.status} for line ${lineNumber}`);
        return {
          bg: 'bg-red-100',
          text: 'Disconnected',
          badge: 'bg-red-100 text-red-800'
        };
      default:
        console.log(`Unknown call status ${callData.status} for line ${lineNumber}`);
        return { 
          bg: 'bg-yellow-100', 
          text: 'WAITING', 
          badge: 'bg-yellow-100 text-yellow-800' 
        };
    }
  };

  const status = getStatusDisplay();
  console.log(`LineDisplay Render - Calculated Status:`, status);

  return (
    <Card className={`transition-all duration-300 ${status.bg}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-600" />
            <span className="text-gray-600">Line {lineNumber}</span>
          </div>
          <Badge 
            variant="outline" 
            className={`${status.badge} border-gray-200`}
          >
            {status.text}
          </Badge>
        </div>
        
        {callData?.phoneNumber && (
          <div className="mt-2 text-sm text-gray-500">
            {callData.phoneNumber}
          </div>
        )}
        
        {callData?.leadName && (
          <div className="mt-1 text-sm font-medium">
            {callData.leadName}
          </div>
        )}
        
        {callData?.company && (
          <div className="mt-1 text-sm text-gray-500">
            {callData.company}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
