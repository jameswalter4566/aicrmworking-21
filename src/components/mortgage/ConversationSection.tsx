
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  type: "email" | "sms";
  content: string;
  sender: "client" | "ai";
  timestamp: Date;
}

interface ConversationSectionProps {
  leadId: string;
}

const ConversationSection = ({ leadId }: ConversationSectionProps) => {
  const [activeTab, setActiveTab] = useState<"all" | "email" | "sms">("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  useEffect(() => {
    // For demonstration purposes, we'll use mock data
    // In a real implementation, you would fetch conversation data from Supabase
    setLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
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
      setLoading(false);
    }, 1000);
  }, [leadId]);
  
  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
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
      <h2 className="text-xl font-bold text-orange-800 mb-4">
        Client Conversations
      </h2>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-orange-100 mb-4">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-orange-200 data-[state=active]:text-orange-900"
          >
            <Phone className="mr-2 h-4 w-4" />
            All Communications
          </TabsTrigger>
          <TabsTrigger 
            value="email" 
            className="data-[state=active]:bg-orange-200 data-[state=active]:text-orange-900"
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger 
            value="sms" 
            className="data-[state=active]:bg-orange-200 data-[state=active]:text-orange-900"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS
          </TabsTrigger>
        </TabsList>
        
        <Card className="bg-orange-50">
          <CardHeader className="bg-orange-100 pb-2">
            <CardTitle className="text-lg font-medium text-orange-900">
              {activeTab === "all" ? "All Communications" : 
               activeTab === "email" ? "Email Communications" : "SMS Communications"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-orange-300 border-t-orange-600"></div>
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
                            ? "bg-white" 
                            : "bg-orange-200"
                        } p-4 rounded-lg shadow-sm`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {message.sender === "client" && (
                            <Avatar className="h-6 w-6 bg-orange-300">
                              <span className="text-xs">C</span>
                            </Avatar>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-0 ${
                              message.type === "email" 
                                ? "bg-blue-100 text-blue-800 hover:bg-blue-100" 
                                : "bg-green-100 text-green-800 hover:bg-green-100"
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
                            <Avatar className="h-6 w-6 bg-orange-600">
                              <span className="text-xs">AI</span>
                            </Avatar>
                          )}
                        </div>
                        <p className={`text-sm ${message.sender === "client" ? "text-orange-900" : "text-orange-900"}`}>
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-sm text-orange-800 italic py-8 text-center">
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
