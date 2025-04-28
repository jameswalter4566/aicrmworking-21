
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, MapPin, Clock, MessageSquare, Mic, Brain, MessageCircle } from 'lucide-react';
import { toast } from "sonner";
import DispositionSelector from '@/components/DispositionSelector';
import { leadProfileService } from '@/services/leadProfile';
import { TranscriptionPanel } from './TranscriptionPanel';
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface LeadDetailsPanelProps {
  leadId?: string;
  isActive?: boolean;
  callSid?: string;
}

// Mock transcription data
const mockTranscriptions = [
  { id: 1, text: "Hi, I'm calling about the property on Oak Street.", speaker: "caller", timestamp: "00:05" },
  { id: 2, text: "I saw your listing online and I'm interested in learning more.", speaker: "caller", timestamp: "00:10" },
  { id: 3, text: "Do you know if there have been any offers on it yet?", speaker: "caller", timestamp: "00:15" }
];

// Mock AI suggestions
const mockSuggestions = [
  "Thank them for their interest in the Oak Street property",
  "Mention that the property just came on the market last week",
  "Ask if they're looking to buy soon or just exploring options",
  "Suggest scheduling a viewing for tomorrow afternoon"
];

export const LeadDetailsPanel = ({ leadId, isActive, callSid }: LeadDetailsPanelProps) => {
  const [leadData, setLeadData] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [currentDisposition, setCurrentDisposition] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTranscription, setShowTranscription] = useState(true);
  const [enableRealTimeRebuttals, setEnableRealTimeRebuttals] = useState(false);
  const [currentTranscriptionIndex, setCurrentTranscriptionIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchLeadData();
    }
  }, [leadId]);

  // Mock real-time transcription effect
  useEffect(() => {
    if (!enableRealTimeRebuttals) return;

    const transcriptionInterval = setInterval(() => {
      if (currentTranscriptionIndex < mockTranscriptions.length) {
        setCurrentTranscriptionIndex(prev => prev + 1);
        setIsThinking(true);
        
        // Show AI thinking for a moment, then show suggestions
        setTimeout(() => {
          setIsThinking(false);
          setShowSuggestions(true);
        }, 1500);
      } else {
        clearInterval(transcriptionInterval);
      }
    }, 4000);

    return () => clearInterval(transcriptionInterval);
  }, [enableRealTimeRebuttals, currentTranscriptionIndex]);

  const fetchLeadData = async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    try {
      const lead = await leadProfileService.getLeadById(leadId);
      const leadNotes = await leadProfileService.getLeadNotes(leadId);
      
      setLeadData(lead);
      setNotes(leadNotes);
      setCurrentDisposition(lead.disposition || 'Not Contacted');
    } catch (error) {
      console.error('Error fetching lead data:', error);
      toast.error('Failed to load lead details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispositionChange = async (disposition: string) => {
    if (!leadId || !disposition) return;
    
    try {
      await leadProfileService.updateDisposition(leadId, disposition);
      setCurrentDisposition(disposition);
      toast.success('Disposition updated successfully');
    } catch (error) {
      console.error('Error updating disposition:', error);
      toast.error('Failed to update disposition');
    }
  };

  const toggleRealTimeRebuttals = (enabled: boolean) => {
    setEnableRealTimeRebuttals(enabled);
    if (enabled) {
      setCurrentTranscriptionIndex(0);
      setShowSuggestions(false);
      toast.success('Real-time rebuttals enabled');
    } else {
      setShowSuggestions(false);
      toast.info('Real-time rebuttals disabled');
    }
  };

  if (!leadId || !leadData) {
    return (
      <Card className="h-full bg-gray-50">
        <CardContent className="p-6 text-center text-gray-500">
          No lead connected
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <div>Connected Lead Details</div>
          <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-50 to-blue-50 p-2 rounded-md">
            <Mic className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">Transcription:</span>
            <Switch 
              checked={showTranscription}
              onCheckedChange={setShowTranscription}
              aria-label="Toggle transcription"
              colorScheme="purple"
            />
            <span className="text-sm">{showTranscription ? 'On' : 'Off'}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Real-time Rebuttals Toggle */}
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-base font-medium text-gray-800">Enable Real-time Rebuttals</span>
          </div>
          <Switch 
            checked={enableRealTimeRebuttals}
            onCheckedChange={toggleRealTimeRebuttals}
            colorScheme="blue"
            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600"
          />
        </div>
        
        {/* Always render the TranscriptionPanel but control visibility through the isVisible prop */}
        <TranscriptionPanel leadId={leadId} callSid={callSid} isVisible={showTranscription} />
        
        {/* Real-time Mock Transcription Panel */}
        <AnimatePresence>
          {enableRealTimeRebuttals && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-4 overflow-hidden"
            >
              <Card className="bg-gradient-to-r from-gray-50 to-blue-50 shadow-sm border-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md flex items-center">
                    <MessageCircle className="h-4 w-4 text-blue-500 mr-2" />
                    Live Conversation
                    <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
                      Real-time
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {mockTranscriptions.slice(0, currentTranscriptionIndex).map((item) => (
                        <div key={item.id} className="p-2 bg-white rounded-md shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-blue-700">Caller</span>
                            <span className="text-xs text-gray-500">{item.timestamp}</span>
                          </div>
                          <p className="text-sm">{item.text}</p>
                        </div>
                      ))}
                      
                      {/* AI Thinking Indicator */}
                      {isThinking && (
                        <div className="p-2">
                          <div className="flex items-center">
                            <Brain className="h-4 w-4 text-purple-500 mr-2 animate-pulse" />
                            <span className="text-xs text-purple-600">AI analyzing conversation...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  {/* AI Suggestions */}
                  <AnimatePresence>
                    {showSuggestions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 pt-3 border-t border-blue-100"
                      >
                        <div className="mb-2">
                          <span className="text-xs font-medium text-purple-700 flex items-center">
                            <Brain className="h-3 w-3 mr-1" /> Suggested Responses
                          </span>
                        </div>
                        <ScrollArea className="h-[100px]">
                          <div className="space-y-2">
                            {mockSuggestions.map((suggestion, idx) => (
                              <div 
                                key={idx} 
                                className="p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-md text-sm cursor-pointer hover:bg-blue-100 transition-colors"
                              >
                                {suggestion}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium mr-2">Name:</span>
                      {leadData.firstName} {leadData.lastName}
                    </div>
                    {leadData.phone1 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {leadData.phone1}
                      </div>
                    )}
                    {leadData.phone2 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {leadData.phone2}
                      </div>
                    )}
                    {leadData.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        {leadData.email}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Address Information</h3>
                  <div className="space-y-2">
                    {leadData.mailingAddress && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <div>
                          <div className="font-medium">Mailing Address:</div>
                          {leadData.mailingAddress}
                        </div>
                      </div>
                    )}
                    {leadData.propertyAddress && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <div>
                          <div className="font-medium">Property Address:</div>
                          {leadData.propertyAddress}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-medium mb-2">Disposition</h3>
                <DispositionSelector
                  currentDisposition={currentDisposition}
                  onDispositionChange={handleDispositionChange}
                  disabled={!isActive}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="notes" className="mt-4">
            <ScrollArea className="h-[300px]">
              {notes.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No notes available
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <Card key={note.id} className="bg-gray-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                          <MessageSquare className="h-4 w-4" />
                          <span className="font-medium">
                            {note.created_by || 'System'}
                          </span>
                          <span className="text-gray-400">•</span>
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
