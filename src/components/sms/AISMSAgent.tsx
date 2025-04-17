
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Send, RefreshCw, Settings, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AISMSAgentProps {
  enabled?: boolean;
}

const AISMSAgent = ({ enabled = false }: AISMSAgentProps) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(enabled);
  const [processing, setProcessing] = useState<boolean>(false);
  const [testMode, setTestMode] = useState<boolean>(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>("");
  const [testMessage, setTestMessage] = useState<string>("");
  const [testResponse, setTestResponse] = useState<string>("");
  
  // Process unprocessed messages (manual trigger for any backlog)
  const handleProcessUnprocessed = async () => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('ai-sms-agent', {
        body: { mode: 'process-all-unprocessed' }
      });
      
      if (error) {
        throw new Error(`Error processing messages: ${error.message}`);
      }
      
      const processedCount = data?.processed || 0;
      toast.success(`Processed ${processedCount} messages successfully`);
      
      console.log('AI SMS Agent results:', data);
    } catch (error) {
      console.error('Failed to process unprocessed messages:', error);
      toast.error('Failed to process messages');
    } finally {
      setProcessing(false);
    }
  };
  
  // Test the AI response with a custom message
  const handleTestAIResponse = async () => {
    if (!testPhoneNumber || !testMessage) {
      toast.error('Phone number and message are required');
      return;
    }
    
    try {
      setProcessing(true);
      setTestResponse("");
      
      const { data, error } = await supabase.functions.invoke('ai-sms-agent', {
        body: { 
          phoneNumber: testPhoneNumber, 
          messageContent: testMessage 
        }
      });
      
      if (error) {
        throw new Error(`Error getting AI response: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }
      
      setTestResponse(data.response);
      toast.success('AI response generated successfully');
    } catch (error) {
      console.error('Failed to test AI response:', error);
      toast.error('Failed to generate AI response');
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <Card className="bg-white border border-blue-100 shadow-sm">
      <CardHeader className="bg-blue-50 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium text-blue-900 flex items-center">
            <Bot className="mr-2 h-5 w-5 text-blue-600" />
            AI SMS Agent
          </CardTitle>
          <Badge 
            variant="outline"
            className="bg-green-100 text-green-800 hover:bg-green-200"
          >
            Real-time Enabled
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-sm text-green-700 font-medium">
              Real-time responses are automatically enabled
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={handleProcessUnprocessed}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Process Backlog
              </>
            )}
          </Button>
        </div>
        
        <div className="border-t border-blue-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-medium text-blue-900 flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              Test AI Response
            </h3>
            <Switch
              id="test-mode-switch"
              checked={testMode}
              onCheckedChange={setTestMode}
              className="ml-2"
            />
          </div>
          
          {testMode && (
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="test-phone">Phone Number</Label>
                  <Input
                    id="test-phone"
                    placeholder="+1234567890"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="test-message">Test Message</Label>
                  <Textarea
                    id="test-message"
                    placeholder="Enter a message to test the AI response"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                
                <Button
                  onClick={handleTestAIResponse}
                  disabled={processing || !testPhoneNumber || !testMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Generate & Send Response
                    </>
                  )}
                </Button>
                
                {testResponse && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-md">
                    <Label>AI Response:</Label>
                    <p className="mt-2 text-blue-900 whitespace-pre-line">
                      {testResponse}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500 mt-4">
          <p>The AI SMS Agent processes incoming messages in real-time and stores responses in the database.</p>
          <p className="mt-1">Use the "Process Backlog" button to manually process any older unprocessed messages.</p>
          <p className="mt-1">Message deduplication is enabled to prevent multiple responses to the same message.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISMSAgent;
