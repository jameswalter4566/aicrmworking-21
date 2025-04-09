
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ThoughtlyContact, ContactNote, ContactActivity, thoughtlyService } from "@/services/thoughtly";
import { AlertTriangle, ArrowLeft, Calendar, Check, Clock, Edit, Mail, MapPin, MessageCircle, Phone, Save, User, X, FileEdit, Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const LeadProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [lead, setLead] = useState<ThoughtlyContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [activity, setActivity] = useState<ContactActivity[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<ThoughtlyContact | null>(null);
  
  useEffect(() => {
    const fetchLeadData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const leadData = await thoughtlyService.getContactById(id);
        setLead(leadData);
        
        const notesData = await thoughtlyService.getContactNotes(id);
        setNotes(notesData);
        
        const activityData = await thoughtlyService.getContactActivity(id);
        setActivity(activityData);
      } catch (err) {
        console.error("Error fetching lead data:", err);
        setError("Failed to load lead data. Please try again.");
        toast.error("Failed to load lead data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLeadData();
  }, [id]);
  
  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    
    try {
      const addedNote = await thoughtlyService.addContactNote(id, newNote);
      setNotes([addedNote, ...notes]);
      setNewNote("");
      toast.success("Note added successfully");
    } catch (err) {
      console.error("Error adding note:", err);
      toast.error("Failed to add note");
    }
  };
  
  const startEditing = () => {
    setEditedLead({ ...lead });
    setIsEditing(true);
  };
  
  const cancelEditing = () => {
    setIsEditing(false);
    setEditedLead(null);
  };
  
  const saveChanges = async () => {
    if (!editedLead || !id) return;
    
    try {
      // In a real implementation, we would call an API endpoint to update the lead
      // For now, we'll just update the local state
      setLead(editedLead);
      setIsEditing(false);
      toast.success("Lead updated successfully");
    } catch (err) {
      console.error("Error updating lead:", err);
      toast.error("Failed to update lead");
    }
  };
  
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };
  
  const getDispositionColor = (disposition?: string) => {
    switch (disposition) {
      case "Not Contacted":
        return "bg-gray-100 text-gray-800";
      case "Contacted":
        return "bg-blue-100 text-blue-800";
      case "Appointment Set":
        return "bg-purple-100 text-purple-800";
      case "Submitted":
        return "bg-green-100 text-green-800";
      case "Dead":
        return "bg-red-100 text-red-800";
      case "DNC":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      case "form":
        return <FileEdit className="h-4 w-4" />;
      case "note":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-crm-blue mb-4"></div>
          <p className="text-gray-500">Loading lead details...</p>
        </div>
      </MainLayout>
    );
  }
  
  if (error || !lead) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-semibold text-red-700">Error Loading Lead</h2>
            </div>
            <p className="text-red-600">{error || "Lead not found"}</p>
            <Button 
              onClick={() => navigate('/people')} 
              className="mt-4 bg-crm-blue hover:bg-crm-blue/90"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/people')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
          
          {!isEditing ? (
            <Button 
              onClick={startEditing}
              size="sm"
              className="mb-4"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Lead
            </Button>
          ) : (
            <div className="space-x-2 mb-4">
              <Button 
                onClick={cancelEditing}
                size="sm"
                variant="outline"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={saveChanges}
                size="sm"
                className="bg-crm-blue hover:bg-crm-blue/90"
              >
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Lead Header */}
          <div className="bg-gradient-to-r from-crm-blue/20 to-crm-blue/10 p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-white">
                {lead.avatar ? (
                  <AvatarImage src={lead.avatar} alt={`${lead.firstName} ${lead.lastName}`} />
                ) : (
                  <AvatarFallback className="bg-crm-blue text-white text-xl">
                    {getInitials(lead.firstName, lead.lastName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800">
                  {lead.firstName} {lead.lastName}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-gray-500">
                  {lead.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span>{lead.email}</span>
                    </div>
                  )}
                  {lead.phone1 && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <span>{lead.phone1}</span>
                    </div>
                  )}
                </div>
              </div>
              <Badge className={`px-3 py-1 text-sm ${getDispositionColor(lead.disposition)}`}>
                {lead.disposition || "Not Contacted"}
              </Badge>
            </div>
          </div>
          
          {/* Main Content */}
          <Tabs defaultValue="details" className="p-6">
            <TabsList className="mb-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input 
                            id="firstName" 
                            value={editedLead?.firstName || ""} 
                            onChange={(e) => setEditedLead({ ...editedLead!, firstName: e.target.value })} 
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input 
                            id="lastName" 
                            value={editedLead?.lastName || ""} 
                            onChange={(e) => setEditedLead({ ...editedLead!, lastName: e.target.value })} 
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={editedLead?.email || ""} 
                          onChange={(e) => setEditedLead({ ...editedLead!, email: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone1">Primary Phone</Label>
                        <Input 
                          id="phone1" 
                          value={editedLead?.phone1 || ""} 
                          onChange={(e) => setEditedLead({ ...editedLead!, phone1: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone2">Secondary Phone</Label>
                        <Input 
                          id="phone2" 
                          value={editedLead?.phone2 || ""} 
                          onChange={(e) => setEditedLead({ ...editedLead!, phone2: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="disposition">Disposition</Label>
                        <select 
                          id="disposition" 
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          value={editedLead?.disposition || "Not Contacted"}
                          onChange={(e) => setEditedLead({ ...editedLead!, disposition: e.target.value })}
                        >
                          <option value="Not Contacted">Not Contacted</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Appointment Set">Appointment Set</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Dead">Dead</option>
                          <option value="DNC">DNC</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Address Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="mailingAddress">Mailing Address</Label>
                        <Textarea 
                          id="mailingAddress" 
                          value={editedLead?.mailingAddress || ""} 
                          onChange={(e) => setEditedLead({ ...editedLead!, mailingAddress: e.target.value })} 
                        />
                      </div>
                      <div>
                        <Label htmlFor="propertyAddress">Property Address</Label>
                        <Textarea 
                          id="propertyAddress" 
                          value={editedLead?.propertyAddress || ""} 
                          onChange={(e) => setEditedLead({ ...editedLead!, propertyAddress: e.target.value })} 
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-2">
                        <input 
                          type="checkbox" 
                          id="sameAddress" 
                          className="rounded border-gray-300"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditedLead({ 
                                ...editedLead!, 
                                propertyAddress: editedLead?.mailingAddress 
                              });
                            }
                          }}
                        />
                        <label htmlFor="sameAddress" className="text-sm text-gray-600">
                          Same as mailing address
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-gray-100">
                      <div className="py-3 grid grid-cols-3">
                        <span className="text-gray-500">Full Name</span>
                        <span className="col-span-2 font-medium">
                          {lead.firstName} {lead.lastName}
                        </span>
                      </div>
                      <div className="py-3 grid grid-cols-3">
                        <span className="text-gray-500">Email</span>
                        <span className="col-span-2">{lead.email || "—"}</span>
                      </div>
                      <div className="py-3 grid grid-cols-3">
                        <span className="text-gray-500">Primary Phone</span>
                        <span className="col-span-2">{lead.phone1 || "—"}</span>
                      </div>
                      <div className="py-3 grid grid-cols-3">
                        <span className="text-gray-500">Secondary Phone</span>
                        <span className="col-span-2">{lead.phone2 || "—"}</span>
                      </div>
                      <div className="py-3 grid grid-cols-3">
                        <span className="text-gray-500">Disposition</span>
                        <span className="col-span-2">
                          <Badge className={`px-2 py-0.5 ${getDispositionColor(lead.disposition)}`}>
                            {lead.disposition || "Not Contacted"}
                          </Badge>
                        </span>
                      </div>
                      <div className="py-3 grid grid-cols-3">
                        <span className="text-gray-500">Tags</span>
                        <div className="col-span-2 flex flex-wrap gap-1">
                          {lead.tags && lead.tags.length > 0 ? (
                            lead.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400">No tags</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Address Information</CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-gray-100">
                      <div className="py-3 grid grid-cols-3">
                        <span className="text-gray-500">Mailing Address</span>
                        <span className="col-span-2">
                          {lead.mailingAddress ? (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                              <span>{lead.mailingAddress}</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                      <div className="py-3 grid grid-cols-3">
                        <span className="text-gray-500">Property Address</span>
                        <span className="col-span-2">
                          {lead.propertyAddress ? (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                              <span>{lead.propertyAddress}</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                      <div className="py-3 grid grid-cols-3">
                        <span className="text-gray-500">Created By</span>
                        <span className="col-span-2">
                          {lead.createdBy || "System"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>Recent interactions with this lead</CardDescription>
                </CardHeader>
                <CardContent>
                  {activity && activity.length > 0 ? (
                    <div className="relative">
                      <div className="absolute top-0 bottom-0 left-5 w-px bg-gray-200 ml-0.5"></div>
                      <ul className="space-y-6">
                        {activity.map((item) => (
                          <li key={item.id} className="relative pl-12">
                            <div className="absolute left-0 rounded-full bg-crm-lightBlue p-1.5 text-crm-blue">
                              {getActivityIcon(item.type)}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex justify-between">
                                <h4 className="font-medium">{item.description}</h4>
                                <time className="text-xs text-gray-500 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDate(item.timestamp)}
                                </time>
                              </div>
                              {item.details && (
                                <div className="mt-1 text-sm text-gray-600">
                                  {item.type === "email" && (
                                    <p>Subject: {item.details.subject}</p>
                                  )}
                                  {item.type === "phone" && (
                                    <p>Duration: {item.details.duration} • Outcome: {item.details.outcome}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p>No activity recorded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>Add and view notes for this lead</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Textarea 
                      placeholder="Add a new note..." 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        className="bg-crm-blue hover:bg-crm-blue/90"
                      >
                        Add Note
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <ScrollArea className="h-[300px] pr-4">
                    {notes && notes.length > 0 ? (
                      <div className="space-y-4">
                        {notes.map((note) => (
                          <Card key={note.id}>
                            <CardContent className="pt-6">
                              <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                            </CardContent>
                            <CardFooter className="flex justify-between text-xs text-gray-500">
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                <span>{note.createdBy || "System"}</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>{formatDate(note.createdAt)}</span>
                              </div>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p>No notes added yet</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default LeadProfile;
