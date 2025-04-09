import React, { useState, useEffect, useRef } from "react";
import { Bot, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

const REBUTTAL_TEMPLATES = {
  "Price Objection": [
    "I understand your concern about the price. Many clients initially feel that way, but they quickly realize the ROI is substantial within just 3 months of implementation.",
    "When you consider the long-term value and cost savings, our solution actually costs less than most alternatives on the market.",
    "I appreciate you being upfront about budget concerns. We do have flexible payment options that might work better for your situation."
  ],
  "Integration Concern": [
    "Let me assure you that our platform integrates seamlessly with your existing systems. Our implementation team will handle the entire process.",
    "Our solution was designed with integration in mind. We've successfully integrated with similar systems at companies just like yours.",
    "That's a valid concern, but we have APIs and pre-built connectors for all major systems, making integration much simpler than you might expect."
  ],
  "Customization": [
    "Yes, our solution is fully customizable to your specific needs. We can set up a demo focused on your industry use case.",
    "The platform is built on a modular architecture, allowing you to enable just the features you need for your unique workflows.",
    "Our professional services team can develop custom modules for any specialized requirements your business might have."
  ],
  "Social Proof": [
    "Many of our clients in your industry, like Company X and Company Y, have seen a 35% increase in efficiency after implementing our solution.",
    "We currently serve over 500 companies in your sector, and our retention rate is above 95%, which speaks to the value they're getting.",
    "One of your competitors recently deployed our solution and reported a 28% reduction in operational costs within the first quarter."
  ],
  "Stalling": [
    "I completely understand you need to consult with your team. Perhaps we could schedule a follow-up call next week with all decision-makers present?",
    "While you discuss internally, I'd be happy to send over some case studies specific to your industry that might help address some questions.",
    "That makes sense. To help with your internal discussions, what specific information would be most valuable for your team to review?"
  ],
  "Competitor Mention": [
    "I'm familiar with that solution. Where our offering really differentiates is our dedicated support team and industry-specific features.",
    "That's a good option too. Many of our current clients actually switched from them because of our more intuitive interface and lower total cost of ownership.",
    "I'd be happy to provide a detailed comparison showing where we excel compared to that solution, especially for your specific use case."
  ],
  "Implementation Concerns": [
    "Our typical implementation takes just 2-3 weeks, and we assign a dedicated project manager to ensure minimal disruption to your operations.",
    "We have a proven implementation methodology that's been refined through hundreds of deployments in organizations similar to yours.",
    "Implementation is actually where many of our clients say we excel. Our team handles all the heavy lifting, requiring minimal time from your staff."
  ]
};

interface RealTimeRebuttalProps {
  isActive: boolean;
  callSid?: string;
}

interface TranscriptionSegment {
  text: string;
  speaker: "customer" | "agent";
  timestamp: number;
}

interface Rebuttal {
  id: number;
  text: string;
  category: string;
  timestamp: number;
}

export const RealTimeRebuttals: React.FC<RealTimeRebuttalProps> = ({ isActive, callSid }) => {
  const [rebuttals, setRebuttals] = useState<Rebuttal[]>([]);
  const [transcribedSegments, setTranscribedSegments] = useState<TranscriptionSegment[]>([]);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [isSimulation, setIsSimulation] = useState<boolean>(true);
  const [lastRebuttalTime, setLastRebuttalTime] = useState<number>(0);
  const [transcriptionSid, setTranscriptionSid] = useState<string | null>(null);
  
  const pollingIntervalRef = useRef<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const analyzeTranscriptForObjections = (text: string): string | null => {
    const objectionPhrases = {
      "Price Objection": ["too expensive", "costs too much", "price", "afford", "budget", "cheaper"],
      "Integration Concern": ["integrate", "integration", "connect", "existing systems", "compatible"],
      "Customization": ["customize", "customization", "specific needs", "tailor", "flexible"],
      "Social Proof": ["other companies", "customer reviews", "testimonials", "case studies", "references"],
      "Stalling": ["need time", "think about it", "discuss with", "get back to you", "not ready", "team"],
      "Competitor Mention": ["other vendor", "competitor", "alternative solution", "already use", "different provider"],
      "Implementation Concerns": ["implementation", "difficult to set up", "complicated", "time-consuming", "training"]
    };
    
    const lowerText = text.toLowerCase();
    
    for (const [category, phrases] of Object.entries(objectionPhrases)) {
      if (phrases.some(phrase => lowerText.includes(phrase.toLowerCase()))) {
        return category;
      }
    }
    
    return null;
  };
  
  const generateRebuttal = (category: string): Rebuttal => {
    const templates = REBUTTAL_TEMPLATES[category as keyof typeof REBUTTAL_TEMPLATES] || REBUTTAL_TEMPLATES["Social Proof"];
    const randomIndex = Math.floor(Math.random() * templates.length);
    
    return {
      id: Date.now(),
      text: templates[randomIndex],
      category,
      timestamp: Date.now()
    };
  };
  
  useEffect(() => {
    const startTranscriptionService = async () => {
      if (isActive && callSid) {
        try {
          console.log("Starting transcription for call:", callSid);
          const { data, error } = await supabase.functions.invoke('retrieve-transcription', {
            body: { action: 'start', callSid }
          });
          
          if (error) {
            throw new Error(error.message);
          }
          
          if (data?.success && data?.data?.sid) {
            setTranscriptionSid(data.data.sid);
            console.log("Started transcription with SID:", data.data.sid);
            toast({
              title: "Transcription Started",
              description: "Real-time transcription is now active for this call.",
            });
            
            startPolling();
          }
        } catch (error) {
          console.error("Error starting transcription:", error);
          setIsSimulation(true);
          startSimulation();
        }
      } else if (!isActive && transcriptionSid && callSid) {
        try {
          const { data, error } = await supabase.functions.invoke('retrieve-transcription', {
            body: { action: 'stop', callSid, transcriptionSid }
          });
          
          if (error) {
            throw new Error(error.message);
          }
          
          console.log("Stopped transcription:", data);
          stopPolling();
        } catch (error) {
          console.error("Error stopping transcription:", error);
        }
        
        setTranscriptionSid(null);
        setRebuttals([]);
        setTranscribedSegments([]);
        setTranscribedText("");
      }
    };
    
    startTranscriptionService();
    
    return () => {
      stopPolling();
    };
  }, [isActive, callSid]);
  
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = window.setInterval(async () => {
      if (isSimulation) {
        await fetchSimulatedTranscription();
      } else {
        await fetchSimulatedTranscription();
      }
    }, 3000);
  };
  
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };
  
  const fetchSimulatedTranscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('retrieve-transcription', {
        body: { action: 'simulate' }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.success && data?.data?.transcriptions) {
        handleNewTranscriptionData(data.data.transcriptions);
        setIsSimulation(true);
      }
    } catch (error) {
      console.error("Error fetching simulated transcription:", error);
    }
  };
  
  const handleNewTranscriptionData = (newSegments: TranscriptionSegment[]) => {
    setTranscribedSegments(prev => {
      const existingTexts = prev.map(segment => segment.text);
      const uniqueNewSegments = newSegments.filter(segment => !existingTexts.includes(segment.text));
      
      return [...prev, ...uniqueNewSegments];
    });
    
    let fullText = "";
    for (const segment of [...transcribedSegments, ...newSegments]) {
      const speakerLabel = segment.speaker === "customer" ? "Customer: " : "You: ";
      fullText += `${speakerLabel}${segment.text}\n`;
    }
    setTranscribedText(fullText);
    
    const customerSegments = newSegments.filter(segment => segment.speaker === "customer");
    
    for (const segment of customerSegments) {
      const objectionCategory = analyzeTranscriptForObjections(segment.text);
      
      if (objectionCategory && Date.now() - lastRebuttalTime > 10000) {
        const newRebuttal = generateRebuttal(objectionCategory);
        setRebuttals(prev => [...prev, newRebuttal]);
        setLastRebuttalTime(Date.now());
      }
    }
  };
  
  const startSimulation = () => {
    if (!isActive) return;
    
    const initialRebuttal = generateRebuttal("Price Objection");
    setRebuttals([initialRebuttal]);
    
    setTranscribedText("Customer: I'm not sure if this is worth the investment right now...");
    
    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => {
      const newText = "Customer: I'm not sure if this is worth the investment right now...\nYou: I understand your concern about the investment...";
      setTranscribedText(newText);
    }, 2000));
    
    timers.push(setTimeout(() => {
      const newText = "Customer: I'm not sure if this is worth the investment right now...\nYou: I understand your concern about the investment...\nCustomer: We have budget constraints this quarter.";
      setTranscribedText(newText);
      
      const newRebuttal = generateRebuttal("Integration Concern");
      setRebuttals(prev => [...prev, newRebuttal]);
    }, 4000));
    
    timers.push(setTimeout(() => {
      const newText = "Customer: I'm not sure if this is worth the investment right now...\nYou: I understand your concern about the investment...\nCustomer: We have budget constraints this quarter.\nCustomer: And I'm worried about integration with our current systems.";
      setTranscribedText(newText);
      
      const newRebuttal = generateRebuttal("Customization");
      setRebuttals(prev => [...prev, newRebuttal]);
    }, 8000));
    
    timers.push(setTimeout(() => {
      const newText = "Customer: I'm not sure if this is worth the investment right now...\nYou: I understand your concern about the investment...\nCustomer: We have budget constraints this quarter.\nCustomer: And I'm worried about integration with our current systems.\nYou: We can discuss flexible payment options...";
      setTranscribedText(newText);
    }, 11000));
    
    timers.push(setTimeout(() => {
      const newText = "Customer: I'm not sure if this is worth the investment right now...\nYou: I understand your concern about the investment...\nCustomer: We have budget constraints this quarter.\nCustomer: And I'm worried about integration with our current systems.\nYou: We can discuss flexible payment options...\nCustomer: I need to talk this over with my team first.";
      setTranscribedText(newText);
      
      const newRebuttal = generateRebuttal("Stalling");
      setRebuttals(prev => [...prev, newRebuttal]);
    }, 15000));
  };
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [transcribedText, rebuttals]);
  
  if (!isActive) return null;
  
  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="bg-muted/40 pb-2 pt-3 px-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-500" />
            Live Conversation {isSimulation ? "(Simulation)" : ""}
          </CardTitle>
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            Transcribing
          </Badge>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="h-[100px] w-full rounded-md border p-2 bg-muted/30" ref={scrollAreaRef as any}>
            <div className="whitespace-pre-line text-sm">
              {transcribedText}
              <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse">|</span>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="bg-muted/40 pb-2 pt-3 px-4 border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-green-500" />
            Real-Time Rebuttals
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="h-[200px] pr-2">
            <AnimatePresence>
              {rebuttals.map((rebuttal) => (
                <motion.div
                  key={rebuttal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-3 last:mb-0"
                >
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="bg-green-100 text-green-700 text-xs font-normal">
                        {rebuttal.category}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {Date.now() - rebuttal.timestamp < 60000 
                          ? `${Math.round((Date.now() - rebuttal.timestamp) / 1000)}s ago` 
                          : `${Math.round((Date.now() - rebuttal.timestamp) / 60000)}m ago`}
                      </span>
                    </div>
                    <p className="text-sm">{rebuttal.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
