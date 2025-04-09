
import React, { useState, useEffect } from "react";
import { Bot, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

// Mock rebuttal data
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

interface RealTimeRebuttalProps {
  isActive: boolean;
}

export const RealTimeRebuttals: React.FC<RealTimeRebuttalProps> = ({ isActive }) => {
  const [rebuttals, setRebuttals] = useState<typeof MOCK_REBUTTALS>([]);
  const [transcribedText, setTranscribedText] = useState<string>("Customer: I'm not sure if this is worth the investment right now...");

  // Simulate incoming rebuttals when active
  useEffect(() => {
    if (!isActive) {
      setRebuttals([]);
      return;
    }

    // Start with one rebuttal
    setRebuttals([MOCK_REBUTTALS[0]]);

    // Add more rebuttals over time to simulate real-time responses
    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => {
      setTranscribedText(prev => prev + "\nYou: I understand your concern about the investment...");
    }, 2000));
    
    timers.push(setTimeout(() => {
      setTranscribedText(prev => prev + "\nCustomer: We have budget constraints this quarter.");
      setRebuttals(prev => [...prev, MOCK_REBUTTALS[1]]);
    }, 4000));
    
    timers.push(setTimeout(() => {
      setTranscribedText(prev => prev + "\nCustomer: And I'm worried about integration with our current systems.");
      setRebuttals(prev => [...prev, MOCK_REBUTTALS[2]]);
    }, 8000));
    
    timers.push(setTimeout(() => {
      setTranscribedText(prev => prev + "\nYou: We can discuss flexible payment options...");
    }, 11000));
    
    timers.push(setTimeout(() => {
      setTranscribedText(prev => prev + "\nCustomer: I need to talk this over with my team first.");
      setRebuttals(prev => [...prev, MOCK_REBUTTALS[4]]);
    }, 15000));

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isActive]);

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
            Transcribing
          </Badge>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="h-[100px] w-full rounded-md border p-2 bg-muted/30">
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
                      <span className="text-xs text-gray-500">{index === 0 ? 'Just now' : `${index + 1}m ago`}</span>
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
