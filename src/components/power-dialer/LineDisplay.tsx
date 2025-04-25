
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
    company?: string;
  };
}

export const LineDisplay = ({ lineNumber, currentCall }: LineDisplayProps) => {
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (currentCall?.status === 'in-progress' && currentCall?.startTime) {
      interval = setInterval(() => {
        const duration = Math.floor((new Date().getTime() - currentCall.startTime!.getTime()) / 1000);
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
    if (!currentCall?.status) {
      return { bg: 'bg-white', text: 'FREE', badge: 'bg-gray-100 text-gray-500' };
    }
    
    switch (currentCall.status) {
      case 'connecting':
      case 'ringing':
        return { 
          bg: 'bg-green-100/50',
          text: `Dialing ${currentCall.leadName || currentCall.phoneNumber}`,
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
        
        {currentCall?.phoneNumber && (
          <div className="mt-2 text-sm text-gray-500">
            {currentCall.phoneNumber}
          </div>
        )}
        
        {currentCall?.leadName && (
          <div className="mt-1 text-sm font-medium">
            {currentCall.leadName}
          </div>
        )}
        
        {currentCall?.company && (
          <div className="mt-1 text-sm text-gray-500">
            {currentCall.company}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
