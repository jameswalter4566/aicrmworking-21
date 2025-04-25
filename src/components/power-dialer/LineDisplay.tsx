
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
  
  // This function extracts call data from either props or Twilio hook
  const getCallData = React.useCallback(() => {
    // First priority: use the prop if available
    if (currentCall?.status) {
      console.log(`Line ${lineNumber} using currentCall prop:`, currentCall);
      return currentCall;
    }
    
    // Second priority: check for active calls from Twilio hook
    if (!activeCalls) return undefined;
    
    // Convert activeCalls object to array
    const activeCallsArray = Object.entries(activeCalls);
    console.log(`Line ${lineNumber} checking activeCalls:`, activeCallsArray);
    
    // Find a call for this line based on index
    if (activeCallsArray.length >= lineNumber) {
      const [leadId, call] = activeCallsArray[lineNumber - 1];
      if (call) {
        console.log(`Found Twilio call for line ${lineNumber}:`, {leadId, call});
        return {
          phoneNumber: call.phoneNumber,
          status: call.status,
          startTime: call.status === 'in-progress' ? new Date() : undefined,
          leadName: `Lead ${leadId}`, 
        };
      }
    }
    
    return undefined;
  }, [currentCall, activeCalls, lineNumber]);

  // Extract current call data
  const callData = getCallData();
  
  // Log the call data for debugging
  useEffect(() => {
    console.log(`LineDisplay ${lineNumber} callData:`, callData);
  }, [callData, lineNumber]);

  // Set up the timer for ongoing calls
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (callData?.status === 'in-progress' && callData?.startTime) {
      interval = setInterval(() => {
        const duration = Math.floor((new Date().getTime() - callData.startTime!.getTime()) / 1000);
        setCallDuration(duration);
      }, 1000);
      
      console.log(`Starting timer for line ${lineNumber} with call:`, callData);
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
    console.log(`LineDisplay getStatusDisplay - Calculating status for call:`, callData);
    
    if (!callData?.status) {
      console.log("No current call or phone number - displaying FREE state");
      return { bg: 'bg-white', text: 'FREE', badge: 'bg-gray-100 text-gray-500' };
    }
    
    switch (callData.status) {
      case 'connecting':
      case 'ringing':
        return { 
          bg: 'bg-green-100/50',
          text: `Dialing ${callData.leadName || callData.phoneNumber || 'unknown'}`,
          badge: 'bg-green-100 text-green-800'
        };
      case 'in-progress':
        return {
          bg: 'bg-green-500/90',
          text: `Connected ${formatDuration(callDuration)}`,
          badge: 'bg-green-500 text-white'
        };
      case 'completed':
      case 'failed':
      case 'busy':
      case 'no-answer':
        return {
          bg: 'bg-red-100',
          text: 'Disconnected',
          badge: 'bg-red-100 text-red-800'
        };
      default:
        return { 
          bg: 'bg-yellow-100', 
          text: 'WAITING', 
          badge: 'bg-yellow-100 text-yellow-800' 
        };
    }
  };

  const status = getStatusDisplay();
  
  // Log render data
  console.log(`LineDisplay Render - Line ${lineNumber}, Status: ${status.text}`);

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
