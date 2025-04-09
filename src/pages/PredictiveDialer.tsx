
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PredictiveDialerDashboard } from '@/components/predictive-dialer/PredictiveDialerDashboard';
import { PredictiveDialerContactsList } from '@/components/predictive-dialer/PredictiveDialerContactsList';
import { PredictiveDialerQueueMonitor } from '@/components/predictive-dialer/PredictiveDialerQueueMonitor';
import { PredictiveDialerAgentManager } from '@/components/predictive-dialer/PredictiveDialerAgentManager';
import TwilioScript from '@/components/TwilioScript';

const PredictiveDialerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [twilioLoaded, setTwilioLoaded] = useState(false);

  // Redirect if not authenticated
  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      {/* Load Twilio SDK */}
      <TwilioScript onLoad={() => setTwilioLoaded(true)} onError={(err) => console.error('Twilio SDK Error:', err)} />
      
      <h1 className="text-3xl font-bold mb-6">Predictive Dialer</h1>
      <p className="text-gray-600 mb-8">
        The Predictive Dialer automatically places multiple calls simultaneously and connects answered calls
        to available agents. It uses machine learning to detect answering machines and optimize call volume.
      </p>
      
      <Tabs defaultValue="dashboard">
        <TabsList className="mb-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="queue">Queue Monitor</TabsTrigger>
          <TabsTrigger value="agents">Agent Manager</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <PredictiveDialerDashboard twilioLoaded={twilioLoaded} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contacts Management</CardTitle>
            </CardHeader>
            <CardContent>
              <PredictiveDialerContactsList />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Call Queue Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <PredictiveDialerQueueMonitor twilioLoaded={twilioLoaded} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Agent Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <PredictiveDialerAgentManager twilioLoaded={twilioLoaded} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PredictiveDialerPage;
