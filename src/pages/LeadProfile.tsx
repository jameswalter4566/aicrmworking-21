
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/components/layouts/MainLayout";
import { leadProfileService, type LeadProfile as LeadProfileType, LeadNote, LeadActivity } from "@/services/leadProfile";
import { useIndustry } from "@/context/IndustryContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Phone, Mail, MapPin, Tag, Calendar, FileText, 
  Clock, UserCircle, ChevronRight, Send, Edit, Save, X,
  MessageSquare, Activity
} from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { format, formatDistanceToNow } from "date-fns";
import DispositionSelector from "@/components/DispositionSelector";
import Mortgage1003Form from "@/components/mortgage/Mortgage1003Form";

const LeadProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { activeIndustry } = useIndustry();
  const [lead, setLead] = useState<LeadProfileType | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState<LeadProfileType>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchLeadData = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const leadData = await leadProfileService.getLeadById(id);
        setLead(leadData);
        setEditedLead(leadData);
        
        const [notesData, activitiesData] = await Promise.all([
          leadProfileService.getLeadNotes(id),
          leadProfileService.getLeadActivities(id)
        ]);
        
        setNotes(notesData);
        setActivities(activitiesData);
      } catch (err) {
        console.error("Error fetching lead data:", err);
        setError(err instanceof Error ? err.message : "Failed to load lead data");
        toast.error("Failed to load lead data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeadData();
  }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    
    try {
      const addedNote = await leadProfileService.addNote(id, newNote);
      setNotes(prev => [addedNote, ...prev]);
      setNewNote("");
      toast.success("Note added successfully");
    } catch (err) {
      console.error("Error adding note:", err);
      toast.error("Failed to add note");
    }
  };

  const toggleEditMode = () => {
    if (editMode) {
      setEditedLead(lead || {});
    }
    setEditMode(!editMode);
  };

  const handleSaveChanges = async () => {
    if (!id || !editedLead) return;
    
    try {
      setIsSaving(true);
      const updatedLead = await leadProfileService.updateLead(id, editedLead);
      setLead(updatedLead);
      setEditMode(false);
      
      const updatedActivity = {
        id: crypto.randomUUID(),
        lead_id: Number(id),
        type: "Edit",
        description: "Lead information was updated",
        timestamp: new Date().toISOString()
      };
      
      setActivities(prev => [updatedActivity, ...prev]);
      
      toast.success("Lead information updated successfully");
    } catch (err) {
      console.error("Error updating lead:", err);
      toast.error("Failed to update lead information");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditChange = (field: keyof LeadProfileType, value: string) => {
    setEditedLead(prev => ({ ...prev, [field]: value }));
  };

  const handleDispositionChange = async (disposition: string) => {
    if (!id || !lead || lead.disposition === disposition) return;
    
    try {
      setIsSaving(true);
      const updatedLeadData = { ...lead, disposition };
      const updatedLead = await leadProfileService.updateLead(id, updatedLeadData);
      setLead(updatedLead);
      
      const updatedActivity = {
        id: crypto.randomUUID(),
        lead_id: Number(id),
        type: "Disposition Change",
        description: `Disposition updated to ${disposition}`,
        timestamp: new Date().toISOString()
      };
      
      setActivities(prev => [updatedActivity, ...prev]);
      
      toast.success(`Disposition updated to ${disposition}`);
    } catch (err) {
      console.error("Error updating disposition:", err);
      toast.error("Failed to update lead disposition");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMortgageDataSave = async (section: string, data: Record<string, any>) => {
    if (!id || !lead) return;
    
    try {
      setIsSaving(true);
      
      // Create updated mortgage data by merging the new section data with existing data
      const currentMortgageData = lead.mortgageData || {};
      const updatedMortgageData = {
        ...currentMortgageData,
        [section]: data
      };
      
      // Update the lead with the new mortgage data
      const updatedLeadData = { 
        ...lead, 
        mortgageData: updatedMortgageData 
      };
      
      const updatedLead = await leadProfileService.updateLead(id, updatedLeadData);
      setLead(updatedLead);
      
      const updatedActivity = {
        id: crypto.randomUUID(),
        lead_id: Number(id),
        type: "Mortgage Information Update",
        description: `Updated ${section} information`,
        timestamp: new Date().toISOString()
      };
      
      setActivities(prev => [updatedActivity, ...prev]);
      
      toast.success(`Mortgage ${section} information updated successfully`);
    } catch (err) {
      console.error("Error updating mortgage data:", err);
      toast.error(`Failed to update ${section} information`);
    } finally {
      setIsSaving(false);
    }
  };

  const getIndustryOutlineColor = () => {
    switch(activeIndustry) {
      case "mortgage":
        return "border-blue-500";
      case "realEstate":
        return "border-green-500";
      case "debtSettlement":
        return "border-purple-500";
      default:
        return "border-gray-200";
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-500">Loading lead information...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 mb-4">⚠️ {error}</div>
          <Link to="/people">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  if (!lead) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-gray-500 mb-4">Lead not found</div>
          <Link to="/people">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-4">
        <Link to="/people" className="text-blue-600 hover:text-blue-800 flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Leads
        </Link>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="text-gray-500">Lead ID: {lead.id}</p>
        </div>
        <Button 
          variant={editMode ? "destructive" : "outline"}
          onClick={toggleEditMode}
          disabled={isSaving}
        >
          {editMode ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Edit className="mr-2 h-4 w-4" />
              Edit Lead
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Disposition Status</CardTitle>
            <CardDescription>Current status of this lead in your pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Select Disposition</label>
                <DispositionSelector 
                  currentDisposition={editedLead.disposition || ''} 
                  onDispositionChange={(value) => handleEditChange('disposition', value)}
                  disabled={isSaving}
                />
              </div>
            ) : (
              <DispositionSelector 
                currentDisposition={lead.disposition || 'Not Contacted'} 
                onDispositionChange={handleDispositionChange}
                disabled={isSaving}
              />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className={`col-span-2 ${getIndustryOutlineColor()} border-2`}
          >
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Basic details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center">
                <Avatar className="h-16 w-16 mr-4">
                  {lead.avatar ? (
                    <AvatarImage src={lead.avatar} alt={`${lead.firstName} ${lead.lastName}`} />
                  ) : (
                    <AvatarFallback className="bg-blue-50 text-blue-700 text-xl">
                      {lead.firstName?.charAt(0) || '?'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  {editMode ? (
                    <div className="flex space-x-2">
                      <div>
                        <label className="text-sm text-gray-500">First Name</label>
                        <Input 
                          value={editedLead.firstName || ''}
                          onChange={(e) => handleEditChange('firstName', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Last Name</label>
                        <Input 
                          value={editedLead.lastName || ''}
                          onChange={(e) => handleEditChange('lastName', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <h3 className="text-xl font-medium">
                      {lead.firstName} {lead.lastName}
                    </h3>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Contact Details</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Primary Phone</p>
                      {editMode ? (
                        <Input 
                          value={editedLead.phone1 || ''}
                          onChange={(e) => handleEditChange('phone1', e.target.value)}
                        />
                      ) : (
                        <p className="font-medium">{lead.phone1 || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Secondary Phone</p>
                      {editMode ? (
                        <Input 
                          value={editedLead.phone2 || ''}
                          onChange={(e) => handleEditChange('phone2', e.target.value)}
                        />
                      ) : (
                        <p className="font-medium">{lead.phone2 || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Email Address</p>
                      {editMode ? (
                        <Input 
                          value={editedLead.email || ''}
                          onChange={(e) => handleEditChange('email', e.target.value)}
                        />
                      ) : (
                        <p className="font-medium">{lead.email || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Addresses</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Mailing Address</p>
                      {editMode ? (
                        <Textarea 
                          value={editedLead.mailingAddress || ''}
                          onChange={(e) => handleEditChange('mailingAddress', e.target.value)}
                          rows={2}
                        />
                      ) : (
                        <p className="font-medium">{lead.mailingAddress || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Property Address</p>
                      {editMode ? (
                        <Textarea 
                          value={editedLead.propertyAddress || ''}
                          onChange={(e) => handleEditChange('propertyAddress', e.target.value)}
                          rows={2}
                        />
                      ) : (
                        <p className="font-medium">
                          {lead.propertyAddress || 'Not provided'}
                          {lead.propertyAddress === lead.mailingAddress && lead.mailingAddress && (
                            <span className="text-sm text-gray-500 ml-2">(Same as mailing)</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {lead.tags && lead.tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            {editMode && (
              <CardFooter>
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="flex items-center mt-1">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  {lead.createdAt ? (
                    format(new Date(lead.createdAt), 'MMM dd, yyyy')
                  ) : (
                    'Unknown'
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  {lead.updatedAt ? (
                    format(new Date(lead.updatedAt), 'MMM dd, yyyy')
                  ) : (
                    'Unknown'
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Created By</p>
                <p className="flex items-center mt-1">
                  <UserCircle className="h-4 w-4 mr-2 text-gray-500" />
                  {lead.createdBy || 'Unknown'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mortgage 1003 Form - Only show for mortgage industry */}
        {activeIndustry === 'mortgage' && (
          <Mortgage1003Form 
            lead={lead} 
            onSave={handleMortgageDataSave}
            isEditable={!editMode} 
            isSaving={isSaving}
          />
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Lead Notes</CardTitle>
            <CardDescription>Record important information about this lead</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex space-x-2">
              <Textarea
                placeholder="Add a note about this lead..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1"
                rows={3}
              />
              <Button 
                onClick={handleAddNote} 
                disabled={!newNote.trim()}
                className="self-end"
              >
                <Send className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </div>
            
            {notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map(note => (
                  <Card key={note.id} className="border-gray-200">
                    <CardContent className="pt-4">
                      <p className="whitespace-pre-wrap">{note.content}</p>
                      <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                        <p>{note.created_by}</p>
                        <p>{format(new Date(note.created_at), 'MMM dd, yyyy h:mm a')}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-12 w-12 opacity-30 mb-2" />
                <p>No notes have been added yet</p>
                <p className="text-sm">Add your first note to keep track of important information</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Track all interactions with this lead</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="flex">
                    <div className="mr-4 relative">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        {activity.type === "Email" && <Mail className="h-5 w-5 text-blue-600" />}
                        {activity.type === "Call" && <Phone className="h-5 w-5 text-blue-600" />}
                        {activity.type === "Text" && <MessageSquare className="h-5 w-5 text-blue-600" />}
                        {activity.type === "Meeting" && <Calendar className="h-5 w-5 text-blue-600" />}
                        {activity.type === "Edit" && <Edit className="h-5 w-5 text-blue-600" />}
                        {activity.type === "Disposition Change" && <Activity className="h-5 w-5 text-blue-600" />}
                        {activity.type === "Mortgage Information Update" && <FileText className="h-5 w-5 text-blue-600" />}
                      </div>
                      {index < activities.length - 1 && (
                        <div className="absolute top-10 left-5 w-0.5 h-full bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{activity.type}</h4>
                      <p className="text-gray-600">{activity.description}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(activity.timestamp), 'MMM dd, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="mx-auto h-12 w-12 opacity-30 mb-2" />
                <p>No activity has been recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default LeadProfile;
