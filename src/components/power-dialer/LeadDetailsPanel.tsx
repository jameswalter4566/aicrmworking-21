
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, MapPin, Clock, MessageSquare, Mic } from 'lucide-react';
import { toast } from "sonner";
import DispositionSelector from '@/components/DispositionSelector';
import { leadProfileService } from '@/services/leadProfile';
import { TranscriptionPanel } from './TranscriptionPanel';
import { ColoredSwitch } from "@/components/ui/colored-switch";

interface LeadDetailsPanelProps {
  leadId?: string;
  isActive?: boolean;
  callSid?: string;
}

export const LeadDetailsPanel = ({ leadId, isActive, callSid }: LeadDetailsPanelProps) => {
  const [leadData, setLeadData] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [currentDisposition, setCurrentDisposition] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchLeadData();
    }
  }, [leadId]);

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
          <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded-md">
            <Mic className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Transcription:</span>
            <ColoredSwitch 
              checked={showTranscription}
              onCheckedChange={setShowTranscription}
              aria-label="Toggle transcription"
              colorScheme="blue"
            />
            <span className="text-sm">{showTranscription ? 'On' : 'Off'}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Always render the TranscriptionPanel but control visibility through the isVisible prop */}
        <TranscriptionPanel leadId={leadId} callSid={callSid} isVisible={showTranscription} />
        
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
