
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const ManualWebhookProcessor = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [unprocessedMessages, setUnprocessedMessages] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUnprocessedMessages();
  }, []);

  const fetchUnprocessedMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sms_webhooks')
        .select('*')
        .eq('processed', false)
        .order('received_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setUnprocessedMessages(data || []);
    } catch (error) {
      console.error("Error fetching unprocessed messages:", error);
      toast.error("Failed to load unprocessed messages");
    } finally {
      setIsLoading(false);
    }
  };

  const processMessage = async (messageId: string) => {
    setIsProcessing(prev => ({ ...prev, [messageId]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-sms-agent', {
        body: {
          mode: 'process-specific',
          messageId
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success("Message processed successfully");
        // Remove the processed message from the list
        setUnprocessedMessages(prev => prev.filter(msg => msg.id !== messageId));
      } else {
        throw new Error(data?.error || "Failed to process message");
      }
    } catch (error) {
      console.error(`Error processing message ${messageId}:`, error);
      toast.error(`Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const extractMessageDetails = (webhook: any) => {
    const data = webhook.webhook_data;
    
    // Try to extract from SMS Gateway format first
    if (data.messages && Array.isArray(data.messages) && data.messages[0]) {
      const msg = data.messages[0];
      return {
        phoneNumber: msg.number || msg.from,
        message: msg.message,
        timestamp: msg.sentDate || webhook.received_at
      };
    }
    
    // Generic fallback
    return {
      phoneNumber: data.number || data.from || data.From || data.sender || "Unknown",
      message: data.message || data.text || data.Text || data.body || data.Body || "No message content",
      timestamp: webhook.received_at
    };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Unprocessed Webhooks</span>
          <Button size="sm" onClick={fetchUnprocessedMessages} disabled={isLoading}>
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Messages received via webhook that need manual processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : unprocessedMessages.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No unprocessed messages found</p>
        ) : (
          <div className="space-y-4">
            {unprocessedMessages.map((webhook) => {
              const { phoneNumber, message, timestamp } = extractMessageDetails(webhook);
              const date = new Date(timestamp);
              
              return (
                <div key={webhook.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{phoneNumber}</p>
                      <p className="text-sm text-muted-foreground">{date.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline">Unprocessed</Badge>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <p className="py-2">{message}</p>
                  
                  <div className="flex justify-end mt-2">
                    <Button 
                      size="sm" 
                      onClick={() => processMessage(webhook.id)}
                      disabled={isProcessing[webhook.id]}
                    >
                      {isProcessing[webhook.id] ? 'Processing...' : 'Process Now'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          {unprocessedMessages.length} messages awaiting processing
        </p>
      </CardFooter>
    </Card>
  );
};

export default ManualWebhookProcessor;
