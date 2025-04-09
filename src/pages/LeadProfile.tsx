
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/layouts/MainLayout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { thoughtlyService, ThoughtlyContact } from "@/services/thoughtly";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Home, 
  Tag, 
  Clock, 
  Calendar, 
  Edit, 
  Save, 
  X, 
  PlusCircle,
  User,
  MessageSquare,
  Activity,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

type ContactActivity = {
  id: number;
  contactId: string | number;
  type: string;
  description: string;
  timestamp: string;
  performer: string;
};

type ContactNote = {
  id: number;
  contactId: string | number;
  content: string;
  createdAt: string;
  createdBy?: string;
};

const LeadProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<ThoughtlyContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<ThoughtlyContact | null>(null);
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    const fetchLead = async () => {
      setIsLoading(true);
      try {
        if (id) {
          const leadData = await thoughtlyService.getContactById(id);
          setLead(leadData);
          setEditedLead(leadData);
          
          // Fetch notes
          const notesData = await thoughtlyService.getNotes(id);
          setNotes(notesData);
          
          // Fetch activities
          const activitiesData = await thoughtlyService.getActivities(id);
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error("Error fetching lead:", error);
        toast.error("Failed to load lead data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLead();
  }, [id]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit
      setEditedLead(lead);
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async () => {
    try {
      // In a real implementation, you would call the API to update the lead
      // For now, just update the local state
      setLead(editedLead);
      setIsEditing(false);
      toast.success("Lead information updated");
    } catch (error) {
      console.error("Error updating lead:", error);
      toast.error("Failed to update lead information");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Note cannot be empty");
      return;
    }
    
    try {
      await thoughtlyService.addNote(id!, newNote);
      
      // Add the note to the local state
      const newNoteObj = {
        id: Math.floor(Math.random() * 1000),
        contactId: id!,
        content: newNote,
        createdAt: new Date().toISOString(),
        createdBy: "Current User"
      };
      
      setNotes([newNoteObj, ...notes]);
      setNewNote("");
      setIsAddingNote(false);
      toast.success("Note added successfully");
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editedLead) {
      setEditedLead({
        ...editedLead,
        [name]: value
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } catch (error) {
      return dateString;
    }
  };
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'email_opened':
        return <Mail className="h-4 w-4 text-green-500" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-16 w-16 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!lead) {
    return (
      <MainLayout>
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Lead Not Found</h2>
          <p className="mb-6">The lead you are looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/people')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to People
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/people')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to People
        </Button>
        
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{`${lead.firstName || ''} ${lead.lastName || ''}`}</h1>
          
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleEditToggle}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSaveChanges}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </>
            ) : (
              <Button 
                size="sm"
                onClick={handleEditToggle}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Information Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Contact Information</CardTitle>
              {lead.disposition && (
                <Badge className={`disposition-badge disposition-${lead.disposition?.toLowerCase().replace(/\s+/g, '-')}`}>
                  {lead.disposition}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-6">
              <Avatar className="h-24 w-24 mb-4">
                {lead.avatar ? (
                  <AvatarImage src={lead.avatar} alt={`${lead.firstName} ${lead.lastName}`} />
                ) : (
                  <AvatarFallback className="bg-crm-lightBlue text-crm-blue text-2xl">
                    {lead.firstName?.charAt(0) || ''}
                    {lead.lastName?.charAt(0) || ''}
                  </AvatarFallback>
                )}
              </Avatar>
              
              {isEditing ? (
                <div className="w-full space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">First Name</label>
                      <Input
                        name="firstName"
                        value={editedLead?.firstName || ''}
                        onChange={handleInputChange}
                        placeholder="First Name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Last Name</label>
                      <Input
                        name="lastName"
                        value={editedLead?.lastName || ''}
                        onChange={handleInputChange}
                        placeholder="Last Name"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <h2 className="text-xl font-semibold">{`${lead.firstName || ''} ${lead.lastName || ''}`}</h2>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-500 mt-1 mr-3" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Email</p>
                  {isEditing ? (
                    <Input
                      name="email"
                      value={editedLead?.email || ''}
                      onChange={handleInputChange}
                      placeholder="Email"
                    />
                  ) : (
                    <p className="text-sm font-medium">{lead.email || 'N/A'}</p>
                  )}
                </div>
              </div>
              
              {/* Phone 1 */}
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-gray-500 mt-1 mr-3" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Primary Phone</p>
                  {isEditing ? (
                    <Input
                      name="phone1"
                      value={editedLead?.phone1 || ''}
                      onChange={handleInputChange}
                      placeholder="Primary Phone"
                    />
                  ) : (
                    <p className="text-sm font-medium">{lead.phone1 || 'N/A'}</p>
                  )}
                </div>
              </div>
              
              {/* Phone 2 */}
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-gray-500 mt-1 mr-3" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Secondary Phone</p>
                  {isEditing ? (
                    <Input
                      name="phone2"
                      value={editedLead?.phone2 || ''}
                      onChange={handleInputChange}
                      placeholder="Secondary Phone"
                    />
                  ) : (
                    <p className="text-sm font-medium">{lead.phone2 || 'N/A'}</p>
                  )}
                </div>
              </div>
              
              {/* Mailing Address */}
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-500 mt-1 mr-3" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Mailing Address</p>
                  {isEditing ? (
                    <Textarea
                      name="mailingAddress"
                      value={editedLead?.mailingAddress || ''}
                      onChange={handleInputChange}
                      placeholder="Mailing Address"
                    />
                  ) : (
                    <p className="text-sm font-medium whitespace-pre-line">{lead.mailingAddress || 'N/A'}</p>
                  )}
                </div>
              </div>
              
              {/* Property Address */}
              <div className="flex items-start">
                <Home className="h-5 w-5 text-gray-500 mt-1 mr-3" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Property Address</p>
                  {isEditing ? (
                    <Textarea
                      name="propertyAddress"
                      value={editedLead?.propertyAddress || ''}
                      onChange={handleInputChange}
                      placeholder="Property Address"
                    />
                  ) : (
                    <p className="text-sm font-medium whitespace-pre-line">{lead.propertyAddress || 'N/A'}</p>
                  )}
                </div>
              </div>
              
              {/* Tags */}
              <div className="flex items-start">
                <Tag className="h-5 w-5 text-gray-500 mt-1 mr-3" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Tags</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {lead.tags && lead.tags.length > 0 ? (
                      lead.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="bg-gray-100">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">No tags</p>
                    )}
                    {isEditing && (
                      <Button variant="outline" size="sm" className="h-6">
                        <PlusCircle className="h-3 w-3 mr-1" />
                        Add Tag
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Created Info */}
              {lead.createdBy && (
                <div className="flex items-start mt-6 pt-4 border-t border-gray-100">
                  <User className="h-5 w-5 text-gray-500 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Created by</p>
                    <p className="text-sm">{lead.createdBy}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Activities & Notes Tabs */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="activities" className="w-full">
            <CardHeader>
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="activities" className="flex gap-2">
                    <Activity className="h-4 w-4" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="activities" className="mt-0">
                <div className="space-y-4">
                  {activities && activities.length > 0 ? (
                    activities.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex gap-3 p-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="bg-crm-lightBlue rounded-full p-2">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <p className="font-medium">{activity.description}</p>
                            <p className="text-sm text-gray-500">
                              {formatDateTime(activity.timestamp)}
                            </p>
                          </div>
                          <p className="text-sm text-gray-500">
                            By: {activity.performer}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <h3 className="text-lg font-medium text-gray-600">No Activities</h3>
                      <p className="text-gray-400">This lead has no recorded activities yet.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="notes" className="mt-0">
                <div>
                  {!isAddingNote ? (
                    <Button 
                      className="mb-4 w-full" 
                      onClick={() => setIsAddingNote(true)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Note
                    </Button>
                  ) : (
                    <div className="mb-6 bg-crm-lightBlue p-4 rounded-lg">
                      <h3 className="text-sm font-medium mb-2">New Note</h3>
                      <Textarea
                        placeholder="Add your note here..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="mb-3"
                        rows={4}
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setIsAddingNote(false);
                            setNewNote("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleAddNote}
                        >
                          Add Note
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {notes && notes.length > 0 ? (
                      notes.map((note) => (
                        <div 
                          key={note.id} 
                          className="p-4 border border-gray-100 rounded-lg"
                        >
                          <div className="flex justify-between mb-2">
                            <p className="text-sm font-medium">
                              {note.createdBy || "User"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDateTime(note.createdAt)}
                            </p>
                          </div>
                          <p className="text-sm whitespace-pre-line">{note.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <h3 className="text-lg font-medium text-gray-600">No Notes</h3>
                        <p className="text-gray-400">No notes have been added to this lead yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
};

export default LeadProfile;
