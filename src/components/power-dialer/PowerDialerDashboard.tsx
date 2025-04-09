
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PowerDialerAgentStatus from './PowerDialerAgentStatus';
import PowerDialerContactsList from './PowerDialerContactsList';
import PowerDialerControls from './PowerDialerControls';
import PowerDialerQueueMonitor from './PowerDialerQueueMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PowerDialerAgent } from '@/types/powerDialer';
import { useAuth } from '@/context/AuthContext';

const PowerDialerDashboard = () => {
  const [agent, setAgent] = useState<PowerDialerAgent | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user } = useAuth();

  useEffect(() => {
    // Check if user is registered as an agent
    const checkAgent = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('power_dialer_agents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setAgent(data as PowerDialerAgent);
        
        // Subscribe to agent updates
        const subscription = supabase
          .channel('agent-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'power_dialer_agents',
              filter: `id=eq.${data.id}`
            },
            (payload) => {
              setAgent(payload.new as PowerDialerAgent);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(subscription);
        };
      }
    };

    checkAgent();
  }, [user]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Power Dialer</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left column - Agent status & controls */}
        <div className="space-y-4">
          <PowerDialerAgentStatus />
          {agent && (
            <PowerDialerControls 
              agentId={agent.id} 
              agentStatus={agent.status} 
            />
          )}
        </div>
        
        {/* Right column - Tabs for contacts & queue */}
        <div className="md:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="dashboard">Contacts</TabsTrigger>
              <TabsTrigger value="queue">Call Queue</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard">
              <PowerDialerContactsList />
            </TabsContent>
            
            <TabsContent value="queue">
              <PowerDialerQueueMonitor agentId={agent?.id || null} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PowerDialerDashboard;
