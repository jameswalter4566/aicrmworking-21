
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Send, RefreshCw, Settings, Bot, Check, TestTube2, Link } from 'lucide-react';
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
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [showWebhookInfo, setShowWebhookInfo] = useState<boolean>(true);
  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [registeringWebhook, setRegisteringWebhook] = useState<boolean>(false);
  const [webhookRegistered, setWebhookRegistered] = useState<boolean>(false);
  
  // Get the webhook URL - typically this would be configured in your SMS gateway
  useEffect(() => {
    const projectRef = 'imrmboyczebjlbnkgjns';
    setWebhookUrl(`https://${projectRef}.supabase.co/functions/v1/sms-webhook-receiver`);
  }, []);

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

  // Test the webhook directly
  const handleTestWebhook = async () => {
    if (!testPhoneNumber || !testMessage) {
      toast.error('Phone number and message are required');
      return;
    }
    
    try {
      setTestingWebhook(true);
      
      const { data, error } = await supabase.functions.invoke('sms-test-webhook', {
        body: { 
          phoneNumber: testPhoneNumber, 
          message: testMessage,
          format: "json" // You can change this to "form" to test form-encoded format
        }
      });
      
      if (error) {
        throw new Error(`Error testing webhook: ${error.message}`);
      }
      
      console.log('Webhook test response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to test webhook');
      }
      
      toast.success('Webhook test successful');
      
      // If there's a response from the AI, show it
      if (data.webhookResponse?.success) {
        setTimeout(async () => {
          try {
            // Try to fetch the processed message
            if (data.webhookResponse.webhookId) {
              const { data: webhookData, error: fetchError } = await supabase
                .from('sms_webhooks')
                .select('*')
                .eq('id', data.webhookResponse.webhookId)
                .single();
              
              if (fetchError) {
                console.error('Error fetching webhook data:', fetchError);
                return;
              }
              
              if (webhookData?.ai_response) {
                setTestResponse(webhookData.ai_response);
              } else if (webhookData?.processed) {
                setTestResponse("Message was processed but no AI response was stored.");
              } else {
                setTestResponse("Message received but not yet processed by AI.");
              }
            }
          } catch (fetchError) {
            console.error('Error fetching AI response:', fetchError);
          }
        }, 2000); // Wait a bit for processing to complete
      }
      
    } catch (error) {
      console.error('Failed to test webhook:', error);
      toast.error(`Failed to test webhook: ${error.message}`);
    } finally {
      setTestingWebhook(false);
    }
  };

  // Register webhook with SMS Gateway
  const handleRegisterWebhook = async () => {
    if (!webhookUrl) {
      toast.error('Webhook URL is required');
      return;
    }
    
    try {
      setRegisteringWebhook(true);
      
      const { data, error } = await supabase.functions.invoke('sms-register-webhook', {
        body: { 
          webhookUrl: webhookUrl,
          eventType: "message_received"
        }
      });
      
      if (error) {
        throw new Error(`Error registering webhook: ${error.message}`);
      }
      
      console.log('Webhook registration response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to register webhook');
      }
      
      setWebhookRegistered(true);
      toast.success('Webhook registered successfully with SMS Gateway');
      
    } catch (error) {
      console.error('Failed to register webhook:', error);
      toast.error(`Failed to register webhook: ${error.message}`);
    } finally {
      setRegisteringWebhook(false);
    }
  };

  // Copy webhook URL to clipboard
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard');
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
            <Check className="mr-1 h-3 w-3" /> Webhook Enabled
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-sm text-green-700 font-medium">
              Real-time responses via webhook are active
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

        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-blue-800">SMS Webhook Information</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWebhookInfo(!showWebhookInfo)}
              className="h-7 px-2"
            >
              {showWebhookInfo ? 'Hide' : 'Show'}
            </Button>
          </div>

          {showWebhookInfo && (
            <div className="mt-2 space-y-2">
              <div className="text-xs text-blue-700">
                <p>Configure your SMS gateway to forward incoming messages to this webhook URL:</p>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  value={webhookUrl}
                  readOnly
                  className="text-xs font-mono bg-white"
                />
                <Button
                  onClick={copyWebhookUrl}
                  variant="outline"
                  size="sm"
                >
                  Copy
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  onClick={handleRegisterWebhook}
                  disabled={registeringWebhook || webhookRegistered}
                  variant="outline"
                  size="sm"
                  className="border-green-200 text-green-600 hover:bg-green-50"
                >
                  {registeringWebhook ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : webhookRegistered ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Webhook Registered
                    </>
                  ) : (
                    <>
                      <Link className="mr-2 h-4 w-4" />
                      Register with SMS Gateway
                    </>
                  )}
                </Button>
              </div>
              <div className="text-xs text-blue-600 mt-2">
                <p><strong>Troubleshooting:</strong> If your SMS gateway isn't sending data to the webhook, test it directly below.</p>
              </div>
            </div>
          )}
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
                
                <div className="flex flex-col sm:flex-row gap-3">
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
                        Test Direct Response
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !testPhoneNumber || !testMessage}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    {testingWebhook ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing Webhook...
                      </>
                    ) : (
                      <>
                        <TestTube2 className="mr-2 h-4 w-4" />
                        Test Full Webhook
                      </>
                    )}
                  </Button>
                </div>
                
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
          <p>The AI SMS Agent processes incoming messages in real-time via webhook and stores responses in the database.</p>
          <p className="mt-1">Use the "Process Backlog" button to manually process any older unprocessed messages.</p>
          <p className="mt-1">Use the "Test Full Webhook" button to simulate an incoming SMS from your gateway.</p>
          <p className="mt-1">Use the "Register with SMS Gateway" button to automatically register your webhook URL with the SMS gateway.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AISMSAgent;
