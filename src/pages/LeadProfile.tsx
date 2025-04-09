
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "@/components/layouts/MainLayout";
import { leadProfileService, type LeadProfile as LeadProfileType, LeadNote, LeadActivity } from "@/services/leadProfile";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const LeadProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadProfileType | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState<LeadProfileType>({});

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

  const handleSaveChanges = () => {
    setLead(editedLead);
    setEditMode(false);
    toast.success("Lead information updated");
  };

  const handleEditChange = (field: keyof LeadProfileType, value: string) => {
    setEditedLead(prev => ({ ...prev, [field]: value }));
  };

  const getDispositionColor = (disposition?: string) => {
    switch(disposition) {
      case "Not Contacted":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case "Contacted":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "Appointment Set":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case "Submitted":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "Dead":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "DNC":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
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
          <h1 className="text-3xl font-bold flex items-center">
            {lead.firstName} {lead.lastName}
            <Badge 
              className={`ml-4 ${getDispositionColor(lead.disposition)}`}
            >
              {lead.disposition}
            </Badge>
          </h1>
          <p className="text-gray-500">Lead ID: {lead.id}</p>
        </div>
        <Button 
          variant={editMode ? "destructive" : "outline"}
          onClick={toggleEditMode}
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

      <div className="space-y-8">
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-2">
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
                  
                  <div className="mt-1">
                    {editMode ? (
                      <div>
                        <label className="text-sm text-gray-500">Disposition</label>
                        <select
                          value={editedLead.disposition || 'Not Contacted'}
                          onChange={(e) => handleEditChange('disposition', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md mt-1"
                        >
                          <option value="Not Contacted">Not Contacted</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Appointment Set">Appointment Set</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Dead">Dead</option>
                          <option value="DNC">DNC</option>
                        </select>
                      </div>
                    ) : (
                      <Badge className={`${getDispositionColor(lead.disposition)}`}>
                        {lead.disposition}
                      </Badge>
                    )}
                  </div>
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
                <Button onClick={handleSaveChanges}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
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

        {/* Notes Section */}
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
                        <p>{note.createdBy}</p>
                        <p>{format(new Date(note.createdAt), 'MMM dd, yyyy h:mm a')}</p>
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
        
        {/* Activity Section */}
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
