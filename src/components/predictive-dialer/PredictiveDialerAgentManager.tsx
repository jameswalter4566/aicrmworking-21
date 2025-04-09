
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { PredictiveDialerAgent } from '@/types/predictiveDialer';
import { UserPlus, User, Phone } from 'lucide-react';
import { FormEvent } from 'react';

interface PredictiveDialerAgentManagerProps {
  twilioLoaded: boolean;
}

export const PredictiveDialerAgentManager: React.FC<PredictiveDialerAgentManagerProps> = ({ twilioLoaded }) => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<PredictiveDialerAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  
  useEffect(() => {
    fetchAgents();
    
    // Set up real-time subscription for agent updates
    const channel = supabase
      .channel('predictive-dialer-agent-updates')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'power_dialer_agents'
        }, 
        () => {
          fetchAgents();
        })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('power_dialer_agents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddAgent = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!newAgentName.trim()) {
      toast({
        title: "Validation Error",
        description: "Agent name is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Get the current user's ID for creating the agent
      if (!user?.id) {
        throw new Error("User ID not found");
      }
      
      const { data, error } = await supabase
        .from('power_dialer_agents')
        .insert([{
          name: newAgentName,
          user_id: user.id,
          status: 'offline'
        }]);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Agent added successfully"
      });
      
      setNewAgentName('');
      setIsDialogOpen(false);
      fetchAgents();
    } catch (error) {
      console.error('Error adding agent:', error);
      toast({
        title: "Error",
        description: "Failed to add agent",
        variant: "destructive"
      });
    }
  };
  
  const handleUpdateAgentStatus = async (agentId: string, newStatus: 'available' | 'busy' | 'offline') => {
    try {
      const { error } = await supabase
        .from('power_dialer_agents')
        .update({
          status: newStatus,
          last_status_change: new Date().toISOString()
        })
        .eq('id', agentId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Agent status updated to ${newStatus}`
      });
    } catch (error) {
      console.error('Error updating agent status:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive"
      });
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500">Available</Badge>;
      case 'busy':
        return <Badge className="bg-orange-500">Busy</Badge>;
      case 'offline':
        return <Badge className="bg-gray-500">Offline</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const isCurrentUser = (agentUserId: string) => {
    return user?.id === agentUserId;
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Agent Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-1 h-4 w-4" /> Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddAgent} className="space-y-4 my-4">
              <div>
                <label className="block text-sm font-medium mb-1">Agent Name</label>
                <Input
                  placeholder="John Smith"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Agent</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <p className="text-gray-600">No agents found. Add an agent to get started.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Status Change</TableHead>
                  <TableHead>Current Call</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {agent.name}
                        {isCurrentUser(agent.user_id) && (
                          <Badge variant="outline" className="ml-2">You</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(agent.status)}</TableCell>
                    <TableCell>
                      {agent.last_status_change ? new Date(agent.last_status_change).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      {agent.current_call_id ? (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-green-500" />
                          <span className="text-xs">On Call</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        {isCurrentUser(agent.user_id) && (
                          <>
                            <Button 
                              size="sm" 
                              variant={agent.status === 'available' ? "default" : "outline"}
                              onClick={() => handleUpdateAgentStatus(agent.id, 'available')}
                              disabled={!twilioLoaded || agent.status === 'available'}
                            >
                              Available
                            </Button>
                            <Button 
                              size="sm" 
                              variant={agent.status === 'offline' ? "default" : "outline"}
                              onClick={() => handleUpdateAgentStatus(agent.id, 'offline')}
                              disabled={agent.status === 'offline'}
                            >
                              Offline
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
