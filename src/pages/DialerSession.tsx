
import React from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DialerSession = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Dialer Session: {sessionId}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            This is a placeholder for a specific dialer session. The full implementation would 
            include call details and controls for session {sessionId}.
          </p>
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-blue-700">This page is under construction.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DialerSession;
