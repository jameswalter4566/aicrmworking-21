
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const presetResponses: Record<string, string> = {
  'loan status': "Your loan is currently in the Processing stage. The underwriter is reviewing your documentation and we expect to have an update for you within 2-3 business days.",
  'closing date': "Based on our current timeline, we're targeting a closing date of April 28th, 2025. This is subject to change based on document completion and underwriting approval.",
  'interest rate': "Your loan has been locked at an interest rate of 5.25% for a 30-year fixed mortgage.",
  'documents': "You still need to provide your most recent pay stub and proof of homeowners insurance. You can upload these documents in the 'Remaining Conditions' section.",
  'payment': "Your estimated monthly payment will be $1,988.27, which includes principal, interest, taxes, and insurance (PITI).",
  'contact': "Your loan officer is James Walter. You can reach him at james.walter@example.com or (555) 123-4567 during business hours (9 AM - 5 PM, Monday through Friday).",
  'help': "I can help with questions about your loan status, required documents, closing date, interest rate, monthly payments, and more. Just ask away!"
};

const ClientSupport = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hello! I'm your 24/7 mortgage assistant. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollableArea = scrollAreaRef.current;
      scrollableArea.scrollTop = scrollableArea.scrollHeight;
    }
  }, [messages]);
  
  const handleSendMessage = () => {
    if (inputText.trim() === '') return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // Simulate AI typing
    setIsTyping(true);
    
    setTimeout(() => {
      const response = generateResponse(inputText);
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500); // Simulate a delay in response
  };
  
  const generateResponse = (query: string): string => {
    // Simple keyword matching for demo purposes
    const lowerQuery = query.toLowerCase();
    
    for (const [keyword, response] of Object.entries(presetResponses)) {
      if (lowerQuery.includes(keyword)) {
        return response;
      }
    }
    
    return "I'm not sure about that specific question. For detailed information about your loan, please contact your loan officer during business hours, or check the other tabs in this portal for more details.";
  };
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-800">24/7 Support</h1>
      </div>
      
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white pb-3">
          <CardTitle className="text-lg">
            Loan Assistant
          </CardTitle>
          <p className="text-sm opacity-80">
            Ask questions about your loan status, required documents, or next steps
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px] flex flex-col">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <p>{message.text}</p>
                      <div 
                        className={`text-xs mt-1 ${
                          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3 rounded-bl-none">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <Separator />
            
            <div className="p-4 flex items-center">
              <Input
                placeholder="Type your question here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                className="flex-1 mr-2"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={inputText.trim() === ''}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-4 text-sm text-gray-500">
        <p className="mb-2"><strong>Suggested questions:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>What is my current loan status?</li>
          <li>When is my expected closing date?</li>
          <li>What documents do I still need to provide?</li>
          <li>What will my monthly payment be?</li>
          <li>Who is my loan officer?</li>
          <li>What is my interest rate?</li>
        </ul>
      </div>
    </div>
  );
};

export default ClientSupport;
