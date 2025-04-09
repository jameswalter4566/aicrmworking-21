
import React, { useState, useEffect } from "react";
import { Bot, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

// Define potential rebuttal types based on common sales objections
const REBUTTAL_CATEGORIES = {
  PRICE: "Price Objection",
  TIME: "Time Concern", 
  INTEGRATION: "Integration Concern",
  DECISION_MAKER: "Decision Maker",
  COMPETITION: "Competition",
  VALUE: "Value Proposition",
  SOCIAL_PROOF: "Social Proof",
  STALLING: "Stalling Tactic"
};

// Rebuttal templates mapped to categories
const REBUTTAL_TEMPLATES = {
  [REBUTTAL_CATEGORIES.PRICE]: [
    "I understand your concern about the price. Many clients initially feel that way, but they quickly realize the ROI is substantial within just 3 months of implementation.",
    "Looking at this as an investment rather than a cost, our clients typically see a 3x return within the first year.",
    "We offer flexible payment options that might work better with your budget constraints this quarter."
  ],
  [REBUTTAL_CATEGORIES.TIME]: [
    "I appreciate that time is valuable. Our implementation process has been streamlined to minimize disruption to your workflow.",
    "The initial setup takes less than a week, and we have a dedicated team to assist you throughout the process."
  ],
  [REBUTTAL_CATEGORIES.INTEGRATION]: [
    "Let me assure you that our platform integrates seamlessly with your existing systems. Our implementation team will handle the entire process.",
    "We have successfully integrated with similar systems for clients in your industry, and they reported minimal disruption.",
    "Our API architecture makes integration straightforward with most modern systems."
  ],
  [REBUTTAL_CATEGORIES.DECISION_MAKER]: [
    "I completely understand you need to consult with your team. Perhaps we could schedule a follow-up call next week with all decision-makers present?",
    "Would it be helpful if I prepared some specific information to help your discussion with the decision-makers?"
  ],
  [REBUTTAL_CATEGORIES.COMPETITION]: [
    "I appreciate you're evaluating other options. What specifically are you looking for in a solution that would make it the ideal fit?",
    "While our competitors offer similar features, our customer support and implementation process consistently receive higher satisfaction ratings."
  ],
  [REBUTTAL_CATEGORIES.VALUE]: [
    "Beyond the core features, our clients particularly value the ongoing training and support we provide at no additional cost.",
    "What's unique about our solution is how it specifically addresses the challenges you mentioned earlier about [specific point]."
  ],
  [REBUTTAL_CATEGORIES.SOCIAL_PROOF]: [
    "Many of our clients in your industry, like Company X and Company Y, have seen a 35% increase in efficiency after implementing our solution.",
    "I'd be happy to connect you with some of our clients who had similar concerns before joining us."
  ],
  [REBUTTAL_CATEGORIES.STALLING]: [
    "I completely understand you need to consult with your team. Perhaps we could schedule a follow-up call next week with all decision-makers present?",
    "While you're discussing internally, would it be helpful if I sent over some case studies specific to your industry?"
  ]
};

// Keywords that might signal different objection types
const OBJECTION_KEYWORDS = {
  [REBUTTAL_CATEGORIES.PRICE]: ["expensive", "cost", "price", "budget", "afford", "investment", "spend", "money"],
  [REBUTTAL_CATEGORIES.TIME]: ["time", "busy", "schedule", "when", "long", "takes", "implement", "soon", "quickly"],
  [REBUTTAL_CATEGORIES.INTEGRATION]: ["integrate", "compatible", "existing", "system", "work with", "technical", "setup"],
  [REBUTTAL_CATEGORIES.DECISION_MAKER]: ["boss", "manager", "team", "discuss", "decide", "approval", "committee", "board"],
  [REBUTTAL_CATEGORIES.COMPETITION]: ["other", "competitor", "alternative", "considering", "options", "comparing"],
  [REBUTTAL_CATEGORIES.VALUE]: ["worth", "value", "benefit", "results", "outcome", "advantage", "roi"],
  [REBUTTAL_CATEGORIES.SOCIAL_PROOF]: ["others", "customers", "clients", "case", "example", "who else"],
  [REBUTTAL_CATEGORIES.STALLING]: ["think about", "get back", "later", "not now", "next time", "consider", "not sure", "maybe"]
};

interface Transcript {
  speaker: string;
  text: string;
}

interface Rebuttal {
  id: number;
  text: string;
  category: string;
  timestamp: Date;
}

interface RealTimeRebuttalProps {
  isActive: boolean;
  activeCallSid?: string;
}

export const RealTimeRebuttals: React.FC<RealTimeRebuttalProps> = ({ isActive, activeCallSid }) => {
  const [rebuttals, setRebuttals] = useState<Rebuttal[]>([]);
  const [transcriptions, setTranscriptions] = useState<Transcript[]>([]);
  const [fullTranscript, setFullTranscript] = useState<string>("");
  const [simulationMode, setSimulationMode] = useState<boolean>(true);
  const [lastPolled, setLastPolled] = useState<number>(0);
  const [transcriptionSid, setTranscriptionSid] = useState<string | null>(null);
  
  // Get transcriptions from Twilio via our edge function
  const fetchTranscriptions = async () => {
    if (!isActive || !activeCallSid) return;
    
    try {
      const action = transcriptionSid ? 'status' : 'start';
      
      // Call our edge function to interact with Twilio's Transcription API
      const { data, error } = await supabase.functions.invoke('retrieve-transcription', {
        body: {
          action: simulationMode ? 'simulate' : action,
          callSid: activeCallSid,
          transcriptionSid,
          options: {
            track: 'both_tracks',
            partialResults: true,
            languageCode: 'en-US'
          }
        }
      });
      
      if (error) {
        console.error("Error fetching transcriptions:", error);
        // Fall back to simulation mode if there's an error
        setSimulationMode(true);
        return;
      }
      
      if (data.success && data.transcription) {
        // Store the transcription SID for future status checks
        if (data.transcription.sid && !transcriptionSid) {
          setTranscriptionSid(data.transcription.sid);
        }
        
        // Handle transcript data
        if (data.transcript && Array.isArray(data.transcript)) {
          setTranscriptions(data.transcript);
          
          // Update full transcript text
          const transcriptText = data.transcript.map(
            (t: Transcript) => `${t.speaker}: ${t.text}`
          ).join("\n");
          
          setFullTranscript(transcriptText);
          
          // Generate rebuttals based on transcript content
          analyzeTranscriptAndGenerateRebuttals(data.transcript);
        }
      }
      
      setLastPolled(Date.now());
    } catch (err) {
      console.error("Error in transcription fetching:", err);
      // Fall back to simulation mode
      setSimulationMode(true);
    }
  };
  
  // Stop transcription when component unmounts or becomes inactive
  const stopTranscription = async () => {
    if (!activeCallSid || !transcriptionSid) return;
    
    try {
      await supabase.functions.invoke('retrieve-transcription', {
        body: {
          action: 'stop',
          callSid: activeCallSid,
          transcriptionSid
        }
      });
      setTranscriptionSid(null);
    } catch (err) {
      console.error("Error stopping transcription:", err);
    }
  };
  
  // Analyze transcript to detect objections and generate rebuttals
  const analyzeTranscriptAndGenerateRebuttals = (transcript: Transcript[]) => {
    // Only analyze customer statements
    const customerStatements = transcript
      .filter(t => t.speaker.toLowerCase().includes("customer"))
      .map(t => t.text);
    
    if (customerStatements.length === 0) return;
    
    // Look at the most recent customer statement
    const latestStatement = customerStatements[customerStatements.length - 1].toLowerCase();
    
    // Detect objections based on keywords
    const detectedObjectionTypes = Object.entries(OBJECTION_KEYWORDS).filter(([category, keywords]) => {
      return keywords.some(keyword => latestStatement.includes(keyword.toLowerCase()));
    }).map(([category]) => category);
    
    // If we detected an objection, generate a rebuttal
    if (detectedObjectionTypes.length > 0) {
      const objectionType = detectedObjectionTypes[0]; // Take the first detected objection type
      const potentialRebuttals = REBUTTAL_TEMPLATES[objectionType];
      
      if (potentialRebuttals && potentialRebuttals.length > 0) {
        // Select a random rebuttal from the matching category
        const rebuttalText = potentialRebuttals[Math.floor(Math.random() * potentialRebuttals.length)];
        
        // Check if we already suggested this rebuttal
        const rebuttalExists = rebuttals.some(r => r.text === rebuttalText);
        
        if (!rebuttalExists) {
          const newRebuttal: Rebuttal = {
            id: Date.now(),
            text: rebuttalText,
            category: objectionType,
            timestamp: new Date()
          };
          
          setRebuttals(prev => [...prev, newRebuttal]);
        }
      }
    }
  };
  
  // Polling for transcript updates
  useEffect(() => {
    if (!isActive || !activeCallSid) {
      setTranscriptions([]);
      setRebuttals([]);
      setFullTranscript("");
      setTranscriptionSid(null);
      return;
    }
    
    // Initial fetch
    fetchTranscriptions();
    
    // Set up polling
    const intervalId = setInterval(() => {
      fetchTranscriptions();
    }, 3000); // Poll every 3 seconds
    
    return () => {
      clearInterval(intervalId);
      stopTranscription();
    };
  }, [isActive, activeCallSid]);
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, []);

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
            {simulationMode ? "Simulating" : "Transcribing"}
          </Badge>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="h-[100px] w-full rounded-md border p-2 bg-muted/30">
            <div className="whitespace-pre-line text-sm">
              {fullTranscript || "Waiting for conversation to begin..."}
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
              {rebuttals.map((rebuttal, index) => (
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
                        {index === rebuttals.length - 1 ? 'Just now' : `${Math.floor((Date.now() - rebuttal.timestamp.getTime()) / 60000)}m ago`}
                      </span>
                    </div>
                    <p className="text-sm">{rebuttal.text}</p>
                  </div>
                </motion.div>
              ))}
              {rebuttals.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Bot className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-center text-sm">Listening for customer objections...</p>
                  <p className="text-center text-xs mt-1">Rebuttals will appear here</p>
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
