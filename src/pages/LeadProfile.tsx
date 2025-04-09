
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  MessageCircle, 
  Edit, 
  Plus,
  User,
  Home,
  Activity
} from "lucide-react";
import { thoughtlyService } from "@/services/thoughtly";

// Lead disposition colors
const dispositionColors = {
  "Not Contacted": "bg-gray-100 text-gray-800",
  "Contacted": "bg-blue-100 text-blue-800",
  "Appointment Set": "bg-purple-100 text-purple-800",
  "Submitted": "bg-green-100 text-green-800",
  "Dead": "bg-red-100 text-red-800",
  "DNC": "bg-yellow-100 text-yellow-800"
};

const LeadProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [activities, setActivities] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState({});

  useEffect(() => {
    const fetchLead = async () => {
      try {
        setLoading(true);
        // Try to fetch from API if available
        let leadData = null;
        
        if (id) {
          try {
            const result = await thoughtlyService.retrieveLead(parseInt(id));
            if (result && result.data) {
              leadData = result.data;
            }
          } catch (error) {
            console.error("Error fetching lead from API:", error);
          }
        }
        
        // If API fetch failed or returned nothing, use sample data
        if (!leadData) {
          // Sample lead data for development
          leadData = {
            id: parseInt(id),
            firstName: "Sarah",
            lastName: "Johnson",
            email: "sarah.j@example.com",
            mailingAddress: "789 Oak Ave, New York, NY",
            propertyAddress: "321 Pine St, New York, NY",
            phone1: "(555) 123-4567",
            phone2: "(555) 987-6543",
            stage: "Prospect",
            assigned: "michelle team",
            avatar: "",
            disposition: "Contacted",
            createdAt: "2023-05-15T14:32:00Z",
            updatedAt: "2023-06-22T09:15:00Z"
          };
        }
        
        setLead(leadData);
        setEditedLead(leadData);
        
        // Sample notes for development
        setNotes([
          {
            id: 1,
            content: "Initial contact made. Client is interested in looking at properties in the downtown area.",
            createdAt: "2023-05-15T15:30:00Z",
            createdBy: "Michelle Agent"
          },
          {
            id: 2,
            content: "Scheduled a property viewing for next week. Looking specifically for 2-bedroom condos.",
            createdAt: "2023-05-22T10:45:00Z",
            createdBy: "Michelle Agent"
          }
        ]);
        
        // Sample activities for development
        setActivities([
          {
            id: 1,
            type: "call",
            description: "Outbound call - 3 minutes",
            timestamp: "2023-05-15T14:45:00Z",
            details: "Discussed property preferences and budget constraints."
          },
          {
            id: 2,
            type: "email",
            description: "Sent property listings",
            timestamp: "2023-05-16T09:30:00Z",
            details: "Shared 5 property options meeting client criteria."
          },
          {
            id: 3,
            type: "meeting",
            description: "Property viewing",
            timestamp: "2023-05-22T13:00:00Z",
            details: "Viewed 3 properties in the downtown area."
          }
        ]);
      } catch (error) {
        console.error("Error fetching lead data:", error);
        toast.error("Failed to load lead profile");
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const newNoteObj = {
      id: notes.length + 1,
      content: newNote.trim(),
      createdAt: new Date().toISOString(),
      createdBy: "Current User"
    };
    
    setNotes([newNoteObj, ...notes]);
    setNewNote("");
    toast.success("Note added");
  };

  const handleUpdateLead = () => {
    setLead(editedLead);
    setIsEditing(false);
    toast.success("Lead information updated");
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "meeting":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading lead profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Back button and header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/people')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Leads</span>
          </Button>
          
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Lead</span>
            </Button>
          ) : (
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditedLead(lead);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateLead}>Save Changes</Button>
            </div>
          )}
        </div>

        {/* Lead Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center md:items-start">
                <Avatar className="h-24 w-24 mb-3">
                  {lead.avatar ? (
                    <AvatarImage src={lead.avatar} alt={`${lead.firstName} ${lead.lastName}`} />
                  ) : (
                    <AvatarFallback className="text-xl bg-blue-100 text-blue-800">
                      {lead.firstName?.charAt(0)}{lead.lastName?.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Badge className={`${dispositionColors[lead.disposition] || 'bg-gray-100 text-gray-800'} mb-2`}>
                  {lead.disposition}
                </Badge>
                <div className="text-sm text-gray-500 text-center md:text-left">
                  Lead ID: {lead.id}
                </div>
              </div>

              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <Input 
                        value={editedLead.firstName || ''} 
                        onChange={(e) => setEditedLead({...editedLead, firstName: e.target.value})} 
                        placeholder="First Name"
                        className="w-1/2"
                      />
                      <Input 
                        value={editedLead.lastName || ''} 
                        onChange={(e) => setEditedLead({...editedLead, lastName: e.target.value})} 
                        placeholder="Last Name"
                        className="w-1/2"
                      />
                    </div>
                  ) : (
                    `${lead.firstName} ${lead.lastName}`
                  )}
                </h1>
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700 font-medium mr-2">Email:</span>
                      {isEditing ? (
                        <Input 
                          value={editedLead.email || ''} 
                          onChange={(e) => setEditedLead({...editedLead, email: e.target.value})} 
                          placeholder="Email"
                          className="flex-1"
                        />
                      ) : (
                        <span className="text-sm">{lead.email || 'Not provided'}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700 font-medium mr-2">Primary Phone:</span>
                      {isEditing ? (
                        <Input 
                          value={editedLead.phone1 || ''} 
                          onChange={(e) => setEditedLead({...editedLead, phone1: e.target.value})} 
                          placeholder="Primary Phone"
                          className="flex-1"
                        />
                      ) : (
                        <span className="text-sm">{lead.phone1 || 'Not provided'}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700 font-medium mr-2">Secondary Phone:</span>
                      {isEditing ? (
                        <Input 
                          value={editedLead.phone2 || ''} 
                          onChange={(e) => setEditedLead({...editedLead, phone2: e.target.value})} 
                          placeholder="Secondary Phone"
                          className="flex-1"
                        />
                      ) : (
                        <span className="text-sm">{lead.phone2 || 'Not provided'}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-gray-500 mr-2 mt-1" />
                      <span className="text-sm text-gray-700 font-medium mr-2 whitespace-nowrap">Mailing Address:</span>
                      {isEditing ? (
                        <Input 
                          value={editedLead.mailingAddress || ''} 
                          onChange={(e) => setEditedLead({...editedLead, mailingAddress: e.target.value})} 
                          placeholder="Mailing Address"
                          className="flex-1"
                        />
                      ) : (
                        <span className="text-sm break-words">{lead.mailingAddress || 'Not provided'}</span>
                      )}
                    </div>
                    
                    <div className="flex items-start">
                      <Home className="h-4 w-4 text-gray-500 mr-2 mt-1" />
                      <span className="text-sm text-gray-700 font-medium mr-2 whitespace-nowrap">Property Address:</span>
                      {isEditing ? (
                        <Input 
                          value={editedLead.propertyAddress || ''} 
                          onChange={(e) => setEditedLead({...editedLead, propertyAddress: e.target.value})} 
                          placeholder="Property Address"
                          className="flex-1"
                        />
                      ) : (
                        <span className="text-sm break-words">{lead.propertyAddress || 'Not provided'}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700 font-medium mr-2">Assigned To:</span>
                      {isEditing ? (
                        <Input 
                          value={editedLead.assigned || ''} 
                          onChange={(e) => setEditedLead({...editedLead, assigned: e.target.value})} 
                          placeholder="Assigned To"
                          className="flex-1"
                        />
                      ) : (
                        <span className="text-sm">{lead.assigned || 'Unassigned'}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 mt-4 text-sm text-gray-500">
                  <div>Created: {formatDate(lead.createdAt)}</div>
                  <div>Last Updated: {formatDate(lead.updatedAt)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Notes and Activity */}
        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes" className="flex items-center justify-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center justify-center">
              <Activity className="h-4 w-4 mr-2" />
              Activity History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="notes" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lead Notes</CardTitle>
                <CardDescription>Add and view notes about this lead</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Textarea
                    placeholder="Add a new note about this lead..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button 
                    onClick={handleAddNote} 
                    disabled={!newNote.trim()} 
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {notes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No notes yet. Add the first note about this lead.
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm mb-2">{note.content}</div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div>By: {note.createdBy}</div>
                          <div>{formatDate(note.createdAt)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity History</CardTitle>
                <CardDescription>Track all interactions with this lead</CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No activity recorded yet.
                  </div>
                ) : (
                  <div className="relative">
                    {/* Activity Timeline */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                    
                    <div className="space-y-6 ml-12">
                      {activities.map((activity) => (
                        <div key={activity.id} className="relative">
                          <div className="absolute -left-12 mt-1.5">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full border border-gray-200 bg-white">
                              {getActivityIcon(activity.type)}
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium">{activity.description}</h4>
                            <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{formatDate(activity.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default LeadProfile;
