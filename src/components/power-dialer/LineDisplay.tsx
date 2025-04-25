
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Timer } from 'lucide-react';

interface LineDisplayProps {
  lineNumber: number;
  currentCall?: {
    phoneNumber?: string;
    leadName?: string;
    status?: 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
    startTime?: Date;
    parameters?: {
      To?: string;
      firstName?: string;
      lastName?: string;
      leadId?: string;
      company?: string;
    };
  };
}

export const LineDisplay = ({ lineNumber, currentCall }: LineDisplayProps) => {
  const [callDuration, setCallDuration] = useState(0);
  
  useEffect(() => {
    console.log('LineDisplay - current call status:', currentCall?.status, currentCall?.phoneNumber);
    let interval: NodeJS.Timeout | undefined;
    
    if (currentCall?.status === 'in-progress' && currentCall?.startTime) {
      interval = setInterval(() => {
        const duration = Math.floor((new Date().getTime() - (currentCall.startTime as Date).getTime()) / 1000);
        setCallDuration(duration);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentCall?.status, currentCall?.startTime]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = () => {
    if (!currentCall) return { 
      bg: 'bg-gray-50', 
      text: 'Available',
      badgeClass: 'bg-gray-100 text-gray-600' 
    };

    // Get display name from parameters or fallback to leadName
    const displayName = currentCall.parameters?.firstName ? 
      `${currentCall.parameters.firstName} ${currentCall.parameters.lastName || ''}` : 
      currentCall.leadName;
    
    // Get phone number from parameters or fallback to phoneNumber
    const phoneNumber = currentCall.parameters?.To || currentCall.phoneNumber;
    
    switch (currentCall.status) {
      case 'connecting':
      case 'ringing':
        return { 
          bg: 'bg-yellow-50',
          text: `Dialing${displayName ? ` ${displayName}` : ''}`,
          badgeClass: 'bg-yellow-100 text-yellow-800',
          subText: phoneNumber,
          icon: 'phone'
        };
      case 'in-progress':
        return {
          bg: 'bg-green-50',
          text: `Connected (${formatDuration(callDuration)})`,
          badgeClass: 'bg-green-500 text-white',
          subText: displayName || phoneNumber,
          companyName: currentCall.parameters?.company,
          icon: 'active'
        };
      case 'completed':
      case 'failed':
      case 'busy':
      case 'no-answer':
        return {
          bg: 'bg-red-50',
          text: currentCall.status === 'completed' ? 'Call Ended' : 
                currentCall.status === 'busy' ? 'Line Busy' :
                currentCall.status === 'no-answer' ? 'No Answer' : 'Call Failed',
          badgeClass: 'bg-red-100 text-red-800',
          subText: displayName || phoneNumber,
          icon: 'ended'
        };
      default:
        return { 
          bg: 'bg-gray-50', 
          text: 'Available',
          badgeClass: 'bg-gray-100 text-gray-600' 
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <Card className={`transition-all duration-300 ${status.bg}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-700">Line {lineNumber}</span>
            </div>
            <Badge 
              variant="outline" 
              className={`${status.badgeClass || ''} border-gray-200`}
            >
              {status.text}
            </Badge>
          </div>
          
          {status.subText && (
            <div className="text-sm text-gray-600 font-medium">
              {status.subText}
            </div>
          )}
          
          {status.companyName && (
            <div className="text-xs text-gray-500">
              {status.companyName}
            </div>
          )}
          
          {currentCall?.status === 'in-progress' && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Timer className="h-3 w-3" />
              {formatDuration(callDuration)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
