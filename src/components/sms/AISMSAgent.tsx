
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, RefreshCw, Loader } from "lucide-react";
import ManualWebhookProcessor from "./ManualWebhookProcessor";

export const AISMSAgent = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvent, setWebhookEvent] = useState('message_received');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('test');

  useEffect(() => {
    // Generate the webhook URL based on the current site URL
    const baseUrl = window.location.origin;
    const webhookEndpoint = `${baseUrl.replace('localhost', '127.0.0.1')}/functions/v1/sms-webhook-receiver`;
    setWebhookUrl(webhookEndpoint);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !message) {
      toast.error("Please enter both phone number and message");
      return;
    }

    setIsLoading(true);
    setAiResponse('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-sms-agent', {
        body: { 
          phoneNumber, 
          messageContent: message,
          sendSms: false // Set to true to actually send SMS, false just for testing AI response
        }
      });

      if (error) throw error;

      if (data?.response) {
        setAiResponse(data.response);
        toast.success("AI response generated successfully");
      } else {
        throw new Error("No response received from AI");
      }
    } catch (error) {
      console.error("Error testing AI SMS agent:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReal = async () => {
    if (!phoneNumber || !message) {
      toast.error("Please enter both phone number and message");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-sms-agent', {
        body: { 
          phoneNumber, 
          messageContent: message,
          sendSms: true
        }
      });

      if (error) throw error;

      if (data?.response) {
        setAiResponse(data.response);
        toast.success("Message sent and AI response generated");
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending AI SMS:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const registerWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Please enter a webhook URL");
      return;
    }

    setIsRegistering(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sms-register-webhook', {
        body: { 
          webhookUrl, 
          eventType: webhookEvent
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Webhook registered successfully");
      } else {
        throw new Error(data?.error || "Failed to register webhook");
      }
    } catch (error) {
      console.error("Error registering webhook:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const testGatewayWebhook = async () => {
    if (!phoneNumber) {
      toast.error("Please enter a phone number for the test");
      return;
    }

    const testMessage = message || "This is a test message from the webhook simulator";
    setIsTesting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sms-test-gateway-webhook', {
        body: { 
          phoneNumber, 
          message: testMessage,
          includeSignature: true
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Test webhook sent successfully");
        console.log("Webhook test response:", data);
      } else {
        throw new Error(data?.error || "Failed to test webhook");
      }
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">AI SMS Agent</h2>
      
      <Tabs defaultValue="test" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="test">Test AI</TabsTrigger>
          <TabsTrigger value="webhook">Register Webhook</TabsTrigger>
          <TabsTrigger value="gateway">Test Gateway Format</TabsTrigger>
          <TabsTrigger value="process">Process Messages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="test" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test AI SMS Response</CardTitle>
              <CardDescription>
                Test how the AI would respond to an incoming SMS message
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+11234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Type the message content here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 
                      <><Loader size={16} className="mr-2 animate-spin" /> Testing...</> : 
                      'Test AI Response'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleSendReal} 
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 
                      <><Loader size={16} className="mr-2 animate-spin" /> Sending...</> : 
                      'Send Real Message'}
                  </Button>
                </div>
              </form>
            </CardContent>
            {aiResponse && (
              <CardFooter className="flex-col items-start">
                <p className="font-medium mb-2">AI Response:</p>
                <div className="p-3 bg-muted rounded-md w-full">
                  {aiResponse}
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="webhook" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Register SMS Gateway Webhook</CardTitle>
              <CardDescription>
                Register your webhook URL with the SMS Gateway
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  This URL will receive incoming SMS notifications
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Event Type</Label>
                <RadioGroup value={webhookEvent} onValueChange={setWebhookEvent}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="message_received" id="message_received" />
                    <Label htmlFor="message_received">message_received</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all">all</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Make sure your SMS Gateway can reach this URL. If you're running locally, you may need to use a service like ngrok.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={registerWebhook} 
                disabled={isRegistering} 
                className="w-full"
              >
                {isRegistering ? 
                  <><Loader size={16} className="mr-2 animate-spin" /> Registering...</> : 
                  'Register with SMS Gateway'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="gateway" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Gateway Webhook Format</CardTitle>
              <CardDescription>
                Test if your webhook can handle the SMS Gateway format correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testPhone">Phone Number</Label>
                <Input
                  id="testPhone"
                  placeholder="+11234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="testMessage">Test Message (Optional)</Label>
                <Textarea
                  id="testMessage"
                  placeholder="Test message content..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  If left empty, a default test message will be used
                </p>
              </div>
              
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>How This Works</AlertTitle>
                <AlertDescription>
                  This will simulate an incoming SMS from the Gateway by sending a test request to your webhook endpoint in the same format the Gateway uses
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={testGatewayWebhook} 
                disabled={isTesting} 
                className="w-full"
              >
                {isTesting ? 
                  <><Loader size={16} className="mr-2 animate-spin" /> Sending Test...</> : 
                  'Test Gateway Format'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="process" className="mt-4">
          <ManualWebhookProcessor />
        </TabsContent>
      </Tabs>
      
      <Separator />
      
      <div className="text-sm text-muted-foreground">
        <p>
          The AI SMS Agent can automatically respond to incoming SMS messages using AI.
        </p>
      </div>
    </div>
  );
};

export default AISMSAgent;
