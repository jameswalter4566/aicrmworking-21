
import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Phone, Send, RefreshCw } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { leadProfileService } from "@/services/leadProfile";

interface Message {
  id: string;
  type: "email" | "sms";
  content: string;
  sender: "client" | "ai";
  timestamp: Date | string;
  phone?: string;
}

interface ConversationSectionProps {
  leadId: string;
}

const ConversationSection = ({ leadId }: ConversationSectionProps) => {
  const [activeTab, setActiveTab] = useState<"all" | "email" | "sms">("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sendingGreeting, setSendingGreeting] = useState<boolean>(false);
  const [leadInfo, setLeadInfo] = useState<{
    firstName?: string;
    lastName?: string;
    phone1?: string;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setLoading(true);
    
    // Fetch lead information
    fetchLeadInfo();
    
    // Fetch messages
    fetchMessages();
  }, [leadId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const fetchLeadInfo = async () => {
    try {
      const leadData = await leadProfileService.getLeadById(leadId);
      setLeadInfo({
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        phone1: leadData.phone1
      });
      console.log("Retrieved lead info:", leadData);
    } catch (error) {
      console.error("Error fetching lead info:", error);
      toast.error("Could not retrieve client information");
    }
  };
  
  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      if (!leadId) {
        console.error("No lead ID provided");
        return;
      }
      
      // Attempt to fetch real messages from our API
      const { data, error } = await supabase.functions.invoke('sms-retrieve-messages-for-lead', {
        body: { leadId }
      });
      
      if (error) {
        throw new Error(`Error fetching messages: ${error.message}`);
      }
      
      if (data.success && data.messages && data.messages.length > 0) {
        // Format incoming messages to match our expected format
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp),
          phone: msg.phone
        }));
        
        // Sort by timestamp (oldest first)
        const sortedMessages = formattedMessages.sort((a: Message, b: Message) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setMessages(sortedMessages);
        console.log("Retrieved messages:", sortedMessages);
      } else {
        console.log("No messages found, using sample data");
        // Fallback to sample data if no messages found
        const mockMessages: Message[] = [
          {
            id: "1",
            type: "email",
            content: "Hello, I'm interested in refinancing my home. Can you tell me what rates are available?",
            sender: "client",
            timestamp: new Date(2025, 3, 12, 10, 30)
          },
          {
            id: "2",
            type: "email",
            content: "Hi there! Current rates for a 30-year fixed refinance are around 5.25% with 0 points for borrowers with good credit. Would you like me to check what specific rate you might qualify for?",
            sender: "ai",
            timestamp: new Date(2025, 3, 12, 10, 45)
          },
          {
            id: "3",
            type: "sms",
            content: "Yes, please. My credit score is around 750.",
            sender: "client",
            timestamp: new Date(2025, 3, 12, 14, 15)
          },
          {
            id: "4",
            type: "sms",
            content: "Great! With a 750 credit score, you could qualify for a 5.125% rate on a 30-year fixed refinance. Would you like to schedule a call to discuss this further?",
            sender: "ai",
            timestamp: new Date(2025, 3, 12, 14, 20)
          }
        ];
        
        setMessages(mockMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Could not retrieve messages");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const sendTemplateGreeting = async () => {
    if (!leadInfo?.phone1) {
      toast.error("No phone number available for this client");
      return;
    }
    
    try {
      setSendingGreeting(true);
      
      // Prepare greeting message with client's name
      const clientName = leadInfo.firstName || "Client";
      const message = `Welcome ${clientName}! Your loan application has officially been submitted to underwriting! Now sit tight over the next 24-48 hours your documents will be reviewed by underwriting. I will message you as soon as we have your approval letter!`;
      
      // Call the SMS send function
      const { data, error } = await supabase.functions.invoke('sms-send-single', {
        body: { 
          phoneNumber: leadInfo.phone1,
          message,
          prioritize: true
        }
      });
      
      if (error) {
        throw new Error(`Error sending SMS: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || "Failed to send message");
      }
      
      // Add message to the local state
      const newMessage: Message = {
        id: data.messageId || `temp-${Date.now()}`,
        type: "sms",
        content: message,
        sender: "ai",
        timestamp: new Date(),
        phone: leadInfo.phone1
      };
      
      setMessages(prev => [...prev, newMessage]);
      toast.success("Greeting message sent successfully!");
      
      // Optional: Record this action in lead activities or notes
      await supabase.functions.invoke('add-lead-note', {
        body: {
          leadId,
          content: `Sent welcome SMS: "${message.substring(0, 50)}..."`,
          createdBy: "System"
        }
      });
      
    } catch (error: any) {
      console.error("Error sending greeting SMS:", error);
      toast.error("Failed to send greeting message");
    } finally {
      setSendingGreeting(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };
  
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };
  
  const filteredMessages = activeTab === "all" 
    ? messages 
    : messages.filter(message => message.type === activeTab);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-blue-800">
          Client Conversations
        </h2>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-blue-300 hover:bg-blue-50 text-blue-700"
          >
            {refreshing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> 
                Refresh Messages
              </>
            )}
          </Button>
          <Button 
            onClick={sendTemplateGreeting}
            disabled={sendingGreeting || !leadInfo?.phone1}
            className="bg-blue-700 hover:bg-blue-800 text-white"
          >
            {sendingGreeting ? (
              <>
                <span className="animate-spin mr-2">⏳</span> Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> 
                Send Template Greeting
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-white border border-blue-100 mb-4">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
          >
            <Phone className="mr-2 h-4 w-4" />
            All Communications
          </TabsTrigger>
          <TabsTrigger 
            value="email" 
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger 
            value="sms" 
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS
          </TabsTrigger>
        </TabsList>
        
        <Card className="bg-white border border-blue-100">
          <CardHeader className="bg-blue-50 pb-2">
            <CardTitle className="text-lg font-medium text-blue-900">
              {activeTab === "all" ? "All Communications" : 
               activeTab === "email" ? "Email Communications" : "SMS Communications"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-300 border-t-blue-600"></div>
              </div>
            ) : filteredMessages.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-6">
                  {filteredMessages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender === "client" ? "justify-start" : "justify-end"}`}
                    >
                      <div 
                        className={`max-w-[80%] ${
                          message.sender === "client" 
                            ? "bg-white border border-blue-100" 
                            : "bg-blue-100 border border-blue-200"
                        } p-4 rounded-lg shadow-sm`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {message.sender === "client" && (
                            <Avatar className="h-6 w-6 bg-blue-300">
                              <span className="text-xs">C</span>
                            </Avatar>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-0 ${
                              message.type === "email" 
                                ? "bg-blue-50 text-blue-800 hover:bg-blue-100" 
                                : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                            }`}
                          >
                            {message.type === "email" ? (
                              <Mail className="h-3 w-3 mr-1" />
                            ) : (
                              <MessageSquare className="h-3 w-3 mr-1" />
                            )}
                            {message.type.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(message.timestamp)}
                          </span>
                          {message.sender === "ai" && (
                            <Avatar className="h-6 w-6 bg-blue-600">
                              <span className="text-xs">AI</span>
                            </Avatar>
                          )}
                        </div>
                        <p className={`text-sm ${message.sender === "client" ? "text-blue-900" : "text-blue-900"}`}>
                          {message.content}
                        </p>
                        
                        {message.phone && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">
                              Phone: {message.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            ) : (
              <div className="text-sm text-blue-800 italic py-8 text-center">
                No {activeTab === "all" ? "conversations" : `${activeTab} messages`} found for this borrower yet.
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default ConversationSection;
