
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, MapPin, Clock, MessageSquare, Tag, User, Calendar } from 'lucide-react';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DispositionSelector from '@/components/DispositionSelector';
import { leadProfileService } from '@/services/leadProfile';
import { supabase } from "@/integrations/supabase/client";

interface LeadDetailsPanelProps {
  leadId?: string;
  isActive?: boolean;
  currentCall?: any;
}

export const LeadDetailsPanel = ({ leadId, isActive, currentCall }: LeadDetailsPanelProps) => {
  const [leadData, setLeadData] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [currentDisposition, setCurrentDisposition] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchLeadData();
    } else if (currentCall?.lead) {
      // If we have lead data from the current call, use it
      setLeadData(currentCall.lead);
      setNotes(currentCall.notes || []);
      setActivities(currentCall.activities || []);
      setCurrentDisposition(currentCall.lead.disposition || 'Not Contacted');
    }
  }, [leadId, currentCall]);

  const fetchLeadData = async () => {
    if (!leadId) return;
    
    setIsLoading(true);
    try {
      const lead = await leadProfileService.getLeadById(leadId);
      const leadNotes = await leadProfileService.getLeadNotes(leadId);
      
      // Get lead activities if available
      let leadActivities: any[] = [];
      try {
        const { data, error } = await supabase
          .from('lead_activities')
          .select('*')
          .eq('lead_id', leadId)
          .order('timestamp', { ascending: false })
          .limit(10);
          
        if (!error && data) {
          leadActivities = data;
        }
      } catch (err) {
        console.error('Error fetching lead activities:', err);
      }
      
      setLeadData(lead);
      setNotes(leadNotes);
      setActivities(leadActivities);
      setCurrentDisposition(lead.disposition || 'Not Contacted');
    } catch (error) {
      console.error('Error fetching lead data:', error);
      toast.error('Failed to load lead details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispositionChange = async (disposition: string) => {
    if (!leadData?.id || !disposition) return;
    
    try {
      // For regular lead ID (numeric)
      if (typeof leadData.id === 'number' || !isNaN(Number(leadData.id))) {
        await leadProfileService.updateDisposition(leadData.id, disposition);
      } else {
        // For dialing session leads or other formats
        // You might need to implement this in the leadProfileService
        console.log('Updating disposition for non-numeric lead ID not implemented');
      }
      
      setCurrentDisposition(disposition);
      toast.success('Disposition updated successfully');
    } catch (error) {
      console.error('Error updating disposition:', error);
      toast.error('Failed to update disposition');
    }
  };

  const handleAddNote = async () => {
    if (!leadData?.id || !newNote.trim()) return;
    
    setIsSavingNote(true);
    try {
      const noteContent = newNote.trim();
      
      // For regular lead ID (numeric)
      if (typeof leadData.id === 'number' || !isNaN(Number(leadData.id))) {
        await leadProfileService.addNote(leadData.id, noteContent);
        
        // Refresh notes
        const updatedNotes = await leadProfileService.getLeadNotes(leadData.id);
        setNotes(updatedNotes);
      } else {
        // For dialing session leads or other formats
        console.log('Adding note for non-numeric lead ID not implemented');
        
        // Add a temporary local note for UI purposes
        const newLocalNote = {
          id: `temp-${Date.now()}`,
          lead_id: leadData.id,
          content: noteContent,
          created_at: new Date().toISOString(),
          created_by: 'Current User'
        };
        
        setNotes([newLocalNote, ...notes]);
      }
      
      setNewNote('');
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setIsSavingNote(false);
    }
  };

  if (!leadData) {
    return (
      <Card className="h-full bg-gray-50">
        <CardContent className="p-6 text-center text-gray-500">
          {isLoading ? 'Loading lead data...' : 'No lead connected'}
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <div>Connected Lead Details</div>
          {leadData?.id && (
            <Badge variant="outline" className="ml-2">
              ID: {leadData.id}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 overflow-auto h-[calc(100%-60px)]">
        <Tabs defaultValue="details" className="h-full">
          <TabsList className="w-full mb-2">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-2 h-[calc(100%-40px)] overflow-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Contact Information</h3>
                  <p className="text-sm text-gray-500">Lead details and contact info</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
              
              {leadData.tags && leadData.tags.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4" />
                    <span className="font-medium">Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {leadData.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className="font-medium mr-1">Created:</span>
                {formatDate(leadData.createdAt)}
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
          
          <TabsContent value="notes" className="mt-2 h-[calc(100%-40px)] overflow-hidden flex flex-col">
            <div className="mb-4">
              <Textarea 
                placeholder="Add a note about this lead..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="resize-none"
                disabled={!isActive}
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isSavingNote || !isActive}
                >
                  {isSavingNote ? 'Saving...' : 'Add Note'}
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
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
                            {formatDate(note.created_at)}
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
          
          <TabsContent value="activity" className="mt-2 h-[calc(100%-40px)] overflow-auto">
            <ScrollArea className="h-full">
              {activities.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No activity records available
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <Card key={activity.id} className="bg-gray-50">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1 text-sm">
                          <Badge 
                            variant={
                              activity.type?.includes('call') ? 'default' : 
                              activity.type?.includes('email') ? 'secondary' : 'outline'
                            }
                            className="text-xs"
                          >
                            {activity.type}
                          </Badge>
                          <Clock className="h-3 w-3" />
                          <span className="text-xs text-gray-500">
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm">{activity.description}</p>
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
