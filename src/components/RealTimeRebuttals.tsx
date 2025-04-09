
import React, { useState, useEffect } from "react";
import { Bot, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/components/ui/use-toast";

// Mock rebuttal data for initial demonstration
const MOCK_REBUTTALS = [
  {
    id: 1,
    text: "I understand your concern about the price. Many clients initially feel that way, but they quickly realize the ROI is substantial within just 3 months of implementation.",
    category: "Price Objection",
  },
  {
    id: 2,
    text: "Let me assure you that our platform integrates seamlessly with your existing systems. Our implementation team will handle the entire process.",
    category: "Integration Concern",
  },
  {
    id: 3,
    text: "Yes, our solution is fully customizable to your specific needs. We can set up a demo focused on your industry use case.",
    category: "Customization",
  },
  {
    id: 4,
    text: "Many of our clients in your industry, like Company X and Company Y, have seen a 35% increase in efficiency after implementing our solution.",
    category: "Social Proof",
  },
  {
    id: 5,
    text: "I completely understand you need to consult with your team. Perhaps we could schedule a follow-up call next week with all decision-makers present?",
    category: "Stalling",
  },
];

// Categories for potential objections
const OBJECTION_CATEGORIES = {
  "price": "Price Objection",
  "cost": "Price Objection",
  "expensive": "Price Objection",
  "budget": "Price Objection",
  "integration": "Integration Concern",
  "compatible": "Integration Concern",
  "systems": "Integration Concern",
  "customization": "Customization",
  "specific": "Customization",
  "tailored": "Customization",
  "time": "Stalling",
  "think": "Stalling",
  "consider": "Stalling",
  "team": "Stalling",
  "results": "Social Proof",
  "proof": "Social Proof",
  "others": "Social Proof",
};

interface RealTimeRebuttalProps {
  isActive: boolean;
  callSid?: string;
}

export const RealTimeRebuttals: React.FC<RealTimeRebuttalProps> = ({ isActive, callSid }) => {
  const [rebuttals, setRebuttals] = useState<typeof MOCK_REBUTTALS>([]);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [transcriptionSid, setTranscriptionSid] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [lastProcessedText, setLastProcessedText] = useState<string>("");
  const [checkCount, setCheckCount] = useState(0);

  // Process transcription text to generate rebuttals
  const processTranscriptionForRebuttals = (text: string) => {
    // Don't process the same text twice
    if (text === lastProcessedText) {
      return;
    }
    
    setLastProcessedText(text);
    
    // Simple algorithm to detect potential objections in the text
    const lowerText = text.toLowerCase();
    
    // Check for keywords that might indicate objections
    const detectedCategories = new Set<string>();
    
    Object.entries(OBJECTION_CATEGORIES).forEach(([keyword, category]) => {
      if (lowerText.includes(keyword)) {
        detectedCategories.add(category);
      }
    });
    
    // Find relevant rebuttals for detected categories
    const newRebuttals = Array.from(detectedCategories).map(category => {
      // Find a rebuttal that matches this category
      const matchingRebuttal = MOCK_REBUTTALS.find(r => r.category === category);
      
      if (matchingRebuttal) {
        return {
          ...matchingRebuttal,
          id: Date.now() + Math.random() // Generate a unique ID
        };
      }
      
      // Default rebuttal if none matches
      return {
        id: Date.now() + Math.random(),
        text: "I hear your concerns. Let me address that for you with some specific details about our solution.",
        category: category
      };
    });
    
    // Add new rebuttals, limiting to 5 most recent
    if (newRebuttals.length > 0) {
      setRebuttals(prev => {
        const combined = [...newRebuttals, ...prev];
        return combined.slice(0, 5); // Keep only the 5 most recent rebuttals
      });
    }
  };

  // Start a transcription session
  const startTranscription = async () => {
    if (!callSid) return;
    
    try {
      setIsTranscribing(true);
      
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/retrieve-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callSid,
          action: 'start',
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to start transcription:", errorText);
        throw new Error(`Failed to start transcription: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.transcriptionSid) {
        setTranscriptionSid(result.transcriptionSid);
        console.log("Transcription started with SID:", result.transcriptionSid);
      } else {
        console.error("Failed to get transcription SID:", result);
      }
    } catch (error) {
      console.error("Error starting transcription:", error);
      toast({
        title: "Transcription Error",
        description: "Failed to start real-time transcription. Using simulated data instead.",
        variant: "destructive",
      });
      
      // Fallback to simulation for development/demo purposes
      simulateTranscription();
    }
  };

  // Stop a transcription session
  const stopTranscription = async () => {
    if (!callSid || !transcriptionSid) return;
    
    try {
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/retrieve-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callSid,
          transcriptionSid,
          action: 'stop',
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to stop transcription:", errorText);
      } else {
        const result = await response.json();
        console.log("Transcription stopped:", result);
      }
    } catch (error) {
      console.error("Error stopping transcription:", error);
    } finally {
      setIsTranscribing(false);
      setTranscriptionSid(null);
    }
  };

  // Simulate transcription for development/demo purposes
  const simulateTranscription = async () => {
    if (!callSid) return;
    
    try {
      // Set initial text
      setTranscribedText("Customer: I'm not sure if this is worth the investment right now...");
      
      // Add a simulated rebuttal
      setRebuttals([MOCK_REBUTTALS[0]]);
      
      // Simulate conversation progression with timeouts
      setTimeout(() => {
        setTranscribedText(prev => prev + "\nYou: I understand your concern about the investment...");
      }, 2000);
      
      setTimeout(() => {
        const newText = "\nCustomer: We have budget constraints this quarter.";
        setTranscribedText(prev => prev + newText);
        processTranscriptionForRebuttals(newText);
      }, 4000);
      
      setTimeout(() => {
        const newText = "\nCustomer: And I'm worried about integration with our current systems.";
        setTranscribedText(prev => prev + newText);
        processTranscriptionForRebuttals(newText);
      }, 8000);
      
      setTimeout(() => {
        setTranscribedText(prev => prev + "\nYou: We can discuss flexible payment options...");
      }, 11000);
      
      setTimeout(() => {
        const newText = "\nCustomer: I need to talk this over with my team first.";
        setTranscribedText(prev => prev + newText);
        processTranscriptionForRebuttals(newText);
      }, 15000);
      
    } catch (error) {
      console.error("Error in simulated transcription:", error);
    }
  };

  // Poll for transcription updates
  const pollTranscriptionUpdates = async () => {
    if (!callSid) return;
    
    try {
      const response = await fetch('https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/retrieve-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callSid,
          action: 'simulate', // Using simulate for now, would be replaced with actual polling endpoint
        })
      });
      
      if (!response.ok) {
        console.error("Failed to poll transcription:", response.status);
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.transcriptionData) {
        // Process the transcription data
        const data = result.transcriptionData;
        
        // Add new text to the transcription
        data.tracks.forEach((track: any) => {
          const newText = `\n${track.label.charAt(0).toUpperCase() + track.label.slice(1)}: ${track.content}`;
          setTranscribedText(prev => {
            // Check if this text is already present to avoid duplicates
            if (prev.includes(track.content)) {
              return prev;
            }
            return prev + newText;
          });
          
          // Process customer text for rebuttals
          if (track.label.toLowerCase() === 'customer') {
            processTranscriptionForRebuttals(track.content);
          }
        });
      }
    } catch (error) {
      console.error("Error polling transcription updates:", error);
    }
  };

  // Effect for handling transcription based on active state
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    let simulationTimeouts: NodeJS.Timeout[] = [];
    
    if (isActive && callSid) {
      if (!isTranscribing) {
        startTranscription();
      }
      
      // Set up polling for updates
      pollingInterval = setInterval(() => {
        setCheckCount(count => count + 1);
      }, 2000);
    } else {
      // Clean up when inactive
      if (isTranscribing) {
        stopTranscription();
      }
      
      setRebuttals([]);
      setTranscribedText("");
      simulationTimeouts.forEach(timeout => clearTimeout(timeout));
    }
    
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      simulationTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [isActive, callSid]);

  // Effect to poll for updates when checkCount changes
  useEffect(() => {
    if (isActive && isTranscribing) {
      pollTranscriptionUpdates();
    }
  }, [checkCount, isActive, isTranscribing]);

  if (!isActive) return null;

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="bg-muted/40 pb-2 pt-3 px-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-500" />
            Live Conversation
          </CardTitle>
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            {isTranscribing ? "Transcribing" : "Ready"}
          </Badge>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="h-[100px] w-full rounded-md border p-2 bg-muted/30">
            <div className="whitespace-pre-line text-sm">
              {transcribedText || "Waiting for conversation to begin..."}
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
              {rebuttals.length > 0 ? (
                rebuttals.map((rebuttal, index) => (
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
                        <span className="text-xs text-gray-500">{index === 0 ? 'Just now' : `${index + 1}m ago`}</span>
                      </div>
                      <p className="text-sm">{rebuttal.text}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex items-center justify-center h-[180px] text-gray-400 text-sm">
                  Waiting for conversation to generate rebuttals...
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
