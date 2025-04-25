
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineDisplayData, CallStatus } from '@/types/dialer';

export const LineDisplay: React.FC<LineDisplayData> = ({ lineNumber, currentCall }) => {
  const [callDuration, setCallDuration] = useState(0);
  const [previousStatus, setPreviousStatus] = useState<CallStatus | undefined>(undefined);

  useEffect(() => {
    if (currentCall?.status !== previousStatus) {
      console.log(`Line ${lineNumber} status changed: ${previousStatus} -> ${currentCall?.status}`);
      setPreviousStatus(currentCall?.status);
      if (previousStatus && currentCall?.status !== 'in-progress') {
        setCallDuration(0);
      }
    }
  }, [currentCall?.status, previousStatus, lineNumber]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (currentCall?.status === 'in-progress' && currentCall?.startTime) {
      // Use existing duration if provided (from server) or calculate from startTime
      const initialDuration = currentCall.duration !== undefined ? currentCall.duration : 
        Math.floor((new Date().getTime() - currentCall.startTime!.getTime()) / 1000);
      
      setCallDuration(initialDuration);
      
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentCall?.status, currentCall?.startTime, currentCall?.duration]);

  useEffect(() => {
    // Debug log to confirm we're receiving error information
    if (currentCall?.errorCode || currentCall?.errorMessage) {
      console.log(`Line ${lineNumber} has error: ${currentCall.errorCode} - ${currentCall.errorMessage}`);
    }
  }, [currentCall?.errorCode, currentCall?.errorMessage, lineNumber]);

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
          bg: 'bg-yellow-100/50',
          text: `Dialing ${currentCall.phoneNumber || ''}`,
          badge: 'bg-yellow-100 text-yellow-800'
        };
      case 'in-progress':
        return {
          bg: 'bg-green-500/90',
          text: `Connected ${formatDuration(callDuration)}`,
          badge: 'bg-green-500 text-white'
        };
      case 'completed':
        return {
          bg: 'bg-gray-100',
          text: 'Call Ended',
          badge: 'bg-gray-100 text-gray-800'
        };
      case 'failed':
        return {
          bg: 'bg-red-100',
          text: 'Call Failed',
          badge: 'bg-red-100 text-red-800'
        };
      case 'busy':
        return {
          bg: 'bg-orange-100',
          text: 'Line Busy',
          badge: 'bg-orange-100 text-orange-800'
        };
      case 'no-answer':
        return {
          bg: 'bg-gray-100',
          text: 'No Answer',
          badge: 'bg-gray-100 text-gray-600'
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

        {currentCall?.errorMessage && (
          <Alert variant="destructive" className="mt-2 py-2 px-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{currentCall.errorMessage}</AlertDescription>
          </Alert>
        )}

        {currentCall?.status === 'in-progress' && (
          <div className="mt-1 text-xs">
            <span className="inline-flex items-center">
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-1"></span> 
              Live call
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
