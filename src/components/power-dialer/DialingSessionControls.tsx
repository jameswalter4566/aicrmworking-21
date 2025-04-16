
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AutoDialerController } from './AutoDialerController';

interface DialingSessionControlsProps {
  sessionId: string | null;
  isActive: boolean;
}

export const DialingSessionControls = ({ 
  sessionId,
  isActive 
}: DialingSessionControlsProps) => {
  if (!sessionId || !isActive) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dialing Session Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <AutoDialerController sessionId={sessionId} />
      </CardContent>
    </Card>
  );
};
