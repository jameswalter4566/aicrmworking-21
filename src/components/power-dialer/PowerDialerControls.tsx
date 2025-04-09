
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { PhoneCall, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PowerDialerControlsProps {
  agentId: string | null;
  agentStatus: string;
}

const PowerDialerControls: React.FC<PowerDialerControlsProps> = ({ 
  agentId,
  agentStatus
}) => {
  const [dialing, setDialing] = useState(false);
  const [concurrentCalls, setConcurrentCalls] = useState<number>(3);

  const startDialer = async () => {
    if (!agentId) {
      toast({
        title: 'Agent Required',
        description: 'You must be registered as an agent to start the dialer.',
        variant: 'destructive',
      });
      return;
    }

    if (agentStatus !== 'available') {
      toast({
        title: 'Agent Status',
        description: 'You must set your status to Available before starting the dialer.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDialing(true);
      
      const response = await supabase.functions.invoke('power-dialer-start', {
        body: { 
          agentId,
          maxConcurrentCalls: concurrentCalls
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error starting dialer');
      }

      if (response.data.success) {
        const successCount = response.data.results.filter((r: any) => r.success).length;
        toast({
          title: 'Dialer Started',
          description: `Successfully initiated ${successCount} calls.`,
        });
      } else if (response.data.error === 'No contacts available to call') {
        toast({
          title: 'No Contacts',
          description: 'There are no contacts available to call. Please add contacts first.',
        });
      } else {
        throw new Error(response.data.error || 'Failed to start dialer');
      }
    } catch (error) {
      console.error('Error starting power dialer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start power dialer',
        variant: 'destructive',
      });
    } finally {
      setDialing(false);
    }
  };

  return (
    <div className="border rounded-md p-4 bg-white shadow-sm">
      <div className="flex flex-col space-y-4">
        <h3 className="font-semibold">Dialer Controls</h3>
        
        <div className="flex flex-col space-y-2">
          <label className="text-sm text-gray-700">Concurrent Calls</label>
          <Select
            value={concurrentCalls.toString()}
            onValueChange={(value) => setConcurrentCalls(parseInt(value))}
            disabled={dialing}
          >
            <SelectTrigger>
              <SelectValue placeholder="Concurrent calls" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 call per agent</SelectItem>
              <SelectItem value="2">2 calls per agent</SelectItem>
              <SelectItem value="3">3 calls per agent (default)</SelectItem>
              <SelectItem value="5">5 calls per agent</SelectItem>
              <SelectItem value="10">10 calls per agent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={startDialer}
          disabled={dialing || !agentId || agentStatus !== 'available'}
          className="w-full flex items-center justify-center"
        >
          {dialing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <PhoneCall className="w-4 h-4 mr-2" />
              Start Power Dialer
            </>
          )}
        </Button>
        
        <p className="text-xs text-gray-500 mt-2">
          The dialer will automatically place calls to contacts with "Not Contacted" status.
          Answering machine detection is enabled.
        </p>
      </div>
    </div>
  );
};

export default PowerDialerControls;
