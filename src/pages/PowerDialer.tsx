import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, PhoneOff, User, Mail, Home, Clock, Calendar, MoreHorizontal, Play, Pause, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TwilioClient from "@/components/TwilioClient";

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone1: string;
  phone2: string;
  stage: string;
  assigned: string;
  mailingAddress: string;
  propertyAddress: string;
  disposition?: string;
  lastContacted?: string;
  leadSource?: string;
  notes?: string;
  avatar?: string;
}

const dummyLeads: Lead[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    phone1: "+15551234567",
    phone2: "+15557654321",
    stage: "New Lead",
    assigned: "Study Bolt",
    mailingAddress: "123 Main St, Anytown USA",
    propertyAddress: "456 Oak Ave, Somewhere USA",
    disposition: "Interested",
    lastContacted: "2023-05-15",
    leadSource: "Website",
    notes: "Looking for a 3-bedroom home in the suburbs",
    avatar: "/placeholder.svg"
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    phone1: "+15552345678",
    phone2: "+15558765432",
    stage: "Follow Up",
    assigned: "Study Bolt",
    mailingAddress: "789 Pine St, Anytown USA",
    propertyAddress: "321 Maple Dr, Somewhere USA",
    disposition: "Very Interested",
    lastContacted: "2023-05-20",
    leadSource: "Referral",
    notes: "Preapproved for $450k mortgage",
    avatar: "/placeholder.svg"
  },
  {
    id: 3,
    firstName: "Robert",
    lastName: "Johnson",
    email: "robert.j@example.com",
    phone1: "+15553456789",
    phone2: "+15559876543",
    stage: "New Lead",
    assigned: "Study Bolt",
    mailingAddress: "555 Cedar Ln, Anytown USA",
    propertyAddress: "777 Birch Rd, Somewhere USA",
    disposition: "Needs Follow Up",
    lastContacted: "2023-05-10",
    leadSource: "Open House",
    notes: "Looking in the downtown area",
    avatar: "/placeholder.svg"
  },
  {
    id: 4,
    firstName: "Emily",
    lastName: "Wilson",
    email: "emily.w@example.com",
    phone1: "+15554567890",
    phone2: "+15550987654",
    stage: "Contacted",
    assigned: "Study Bolt",
    mailingAddress: "888 Elm St, Anytown USA",
    propertyAddress: "999 Walnut Ave, Somewhere USA",
    disposition: "Call Back",
    lastContacted: "2023-05-22",
    leadSource: "Zillow",
    notes: "Interested in investment properties",
    avatar: "/placeholder.svg"
  },
  {
    id: 5,
    firstName: "Michael",
    lastName: "Brown",
    email: "michael.b@example.com",
    phone1: "+15555678901",
    phone2: "+15551098765",
    stage: "Nurturing",
    assigned: "Study Bolt",
    mailingAddress: "111 Spruce St, Anytown USA",
    propertyAddress: "222 Fir Dr, Somewhere USA",
    disposition: "Not Interested",
    lastContacted: "2023-05-18",
    leadSource: "Facebook Ad",
    notes: "Looking for commercial properties",
    avatar: "/placeholder.svg"
  }
];

type CallStatus = "ready" | "in-progress" | "completed" | "no-answer" | "error";

const PowerDialer = () => {
  const [leads, setLeads] = useState<Lead[]>(dummyLeads);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>(dummyLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [callStatuses, setCallStatuses] = useState<Record<number, CallStatus>>({});
  const [isDialerActive, setIsDialerActive] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);
  const { toast } = useToast();
  
  // Filter leads based on search term
  useEffect(() => {
    const filtered = leads.filter(lead => 
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone1.includes(searchTerm) ||
      lead.phone2.includes(searchTerm)
    );
    setFilteredLeads(filtered);
  }, [searchTerm, leads]);

  // Handle device ready event
  const handleDeviceReady = () => {
    setIsClientReady(true);
    toast({
      title: "Dialer Ready",
      description: "You can now make calls to leads.",
    });
  };

  // Handle call errors
  const handleCallError = (error: any) => {
    console.error("Call error:", error);
    if (activeLeadId) {
      setCallStatuses(prev => ({ ...prev, [activeLeadId]: "error" }));
    }
    toast({
      variant: "destructive",
      title: "Call Error",
      description: error.message || "There was an error with the call",
    });
  };

  // Handle call connection
  const handleCallConnect = (connection: any) => {
    if (activeLeadId) {
      setCallStatuses(prev => ({ ...prev, [activeLeadId]: "in-progress" }));
      toast({
        title: "Call Connected",
        description: "You are now connected to the lead.",
      });
    }
  };

  // Handle call disconnection
  const handleCallDisconnect = () => {
    if (activeLeadId) {
      setCallStatuses(prev => ({ ...prev, [activeLeadId]: "completed" }));
      setActiveLeadId(null);
      toast({
        title: "Call Ended",
        description: "The call has ended.",
      });
    }
  };

  // Initiate a call to a lead
  const initiateCall = async (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Lead not found",
      });
      return;
    }

    if (!window.twilioClient || !window.twilioClient.isReady()) {
      toast({
        variant: "destructive",
        title: "Phone Not Ready",
        description: "The phone system is not ready. Please try again.",
      });
      return;
    }

    setActiveLeadId(leadId);
    setCallStatuses(prev => ({ ...prev, [leadId]: "ready" }));
    
    try {
      await window.twilioClient.makeCall(lead.phone1);
    } catch (error: any) {
      console.error("Failed to initiate call:", error);
      setCallStatuses(prev => ({ ...prev, [leadId]: "error" }));
      toast({
        variant: "destructive",
        title: "Call Failed",
        description: error.message || "Failed to initiate call",
      });
    }
  };

  // End the current call
  const endCall = (leadId: number) => {
    if (window.twilioClient && window.twilioClient.connection) {
      window.twilioClient.hangupCall();
      setCallStatuses(prev => ({ ...prev, [leadId]: "completed" }));
      setActiveLeadId(null);
    }
  };

  // Get the status badge for a lead
  const getStatusBadge = (status: CallStatus | undefined) => {
    switch (status) {
      case "ready":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Connecting...</Badge>;
      case "in-progress":
        return <Badge variant="outline" className="bg-green-100 text-green-800">In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
      case "no-answer":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">No Answer</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      {/* Invisible TwilioClient component to handle calls */}
      <TwilioClient 
        onDeviceReady={handleDeviceReady}
        onCallConnect={handleCallConnect}
        onCallDisconnect={handleCallDisconnect}
        onError={handleCallError}
      />
      
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Power Dialer</h1>
          <div className="flex items-center space-x-2">
            <Button 
              variant={isDialerActive ? "destructive" : "default"}
              onClick={() => setIsDialerActive(!isDialerActive)}
              disabled={!isClientReady}
            >
              {isDialerActive ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause Dialer
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Dialer
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, or phone..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Leads</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="contacted">Contacted</TabsTrigger>
            <TabsTrigger value="nurturing">Nurturing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4 mt-4">
            {filteredLeads.map(lead => (
              <Card key={lead.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="p-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <User />
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{lead.firstName} {lead.lastName}</h3>
                            <p className="text-sm text-muted-foreground">{lead.stage}</p>
                          </div>
                        </div>
                        {getStatusBadge(callStatuses[lead.id])}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center text-sm">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          {lead.phone1}
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          {lead.email}
                        </div>
                        <div className="flex items-center text-sm">
                          <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                          {lead.propertyAddress}
                        </div>
                        {lead.lastContacted && (
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            Last Contact: {lead.lastContacted}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col sm:border-l border-t sm:border-t-0 justify-evenly p-4 bg-slate-50">
                      {callStatuses[lead.id] === "in-progress" ? (
                        <Button variant="destructive" onClick={() => endCall(lead.id)}>
                          <PhoneOff className="h-4 w-4 mr-2" />
                          End Call
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          onClick={() => initiateCall(lead.id)}
                          disabled={!isClientReady || callStatuses[lead.id] === "ready" || activeLeadId !== null}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call Now
                        </Button>
                      )}
                      
                      <Button variant="ghost" size="icon" className="mt-2">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="new" className="mt-4">
            {filteredLeads.filter(l => l.stage === "New Lead").map(lead => (
              <Card key={lead.id} className="overflow-hidden mb-4">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="p-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <User />
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{lead.firstName} {lead.lastName}</h3>
                            <p className="text-sm text-muted-foreground">{lead.stage}</p>
                          </div>
                        </div>
                        {getStatusBadge(callStatuses[lead.id])}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center text-sm">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          {lead.phone1}
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          {lead.email}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col sm:border-l border-t sm:border-t-0 justify-evenly p-4 bg-slate-50">
                      {callStatuses[lead.id] === "in-progress" ? (
                        <Button variant="destructive" onClick={() => endCall(lead.id)}>
                          <PhoneOff className="h-4 w-4 mr-2" />
                          End Call
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          onClick={() => initiateCall(lead.id)}
                          disabled={!isClientReady || callStatuses[lead.id] === "ready" || activeLeadId !== null}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="contacted" className="mt-4">
            {filteredLeads.filter(l => l.stage === "Contacted").map(lead => (
              <Card key={lead.id} className="overflow-hidden mb-4">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="p-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <User />
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{lead.firstName} {lead.lastName}</h3>
                            <p className="text-sm text-muted-foreground">{lead.stage}</p>
                          </div>
                        </div>
                        {getStatusBadge(callStatuses[lead.id])}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center text-sm">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          {lead.phone1}
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          {lead.email}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col sm:border-l border-t sm:border-t-0 justify-evenly p-4 bg-slate-50">
                      {callStatuses[lead.id] === "in-progress" ? (
                        <Button variant="destructive" onClick={() => endCall(lead.id)}>
                          <PhoneOff className="h-4 w-4 mr-2" />
                          End Call
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          onClick={() => initiateCall(lead.id)}
                          disabled={!isClientReady || callStatuses[lead.id] === "ready" || activeLeadId !== null}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="nurturing" className="mt-4">
            {filteredLeads.filter(l => l.stage === "Nurturing").map(lead => (
              <Card key={lead.id} className="overflow-hidden mb-4">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="p-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <User />
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{lead.firstName} {lead.lastName}</h3>
                            <p className="text-sm text-muted-foreground">{lead.stage}</p>
                          </div>
                        </div>
                        {getStatusBadge(callStatuses[lead.id])}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="flex items-center text-sm">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          {lead.phone1}
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          {lead.email}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col sm:border-l border-t sm:border-t-0 justify-evenly p-4 bg-slate-50">
                      {callStatuses[lead.id] === "in-progress" ? (
                        <Button variant="destructive" onClick={() => endCall(lead.id)}>
                          <PhoneOff className="h-4 w-4 mr-2" />
                          End Call
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          onClick={() => initiateCall(lead.id)}
                          disabled={!isClientReady || callStatuses[lead.id] === "ready" || activeLeadId !== null}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default PowerDialer;
