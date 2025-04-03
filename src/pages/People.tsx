
import React, { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, Home, MoreHorizontal, Search, Plus, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mailingAddress: string;
  propertyAddress: string;
  phone1: string;
  phone2: string;
  stage: string;
  assigned: string;
  avatar: string;
  disposition: string;
}

const People = () => {
  const navigate = useNavigate();
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const leads: Lead[] = [
    {
      id: 1,
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@example.com",
      mailingAddress: "123 Main St, Anytown USA",
      propertyAddress: "456 Oak Ave, Somewhere USA",
      phone1: "(555) 123-4567",
      phone2: "(555) 987-6543",
      stage: "New Lead",
      assigned: "Study Bolt",
      avatar: "/placeholder.svg",
      disposition: "Interested"
    },
    {
      id: 2,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
      mailingAddress: "789 Pine St, Anytown USA",
      propertyAddress: "321 Maple Dr, Somewhere USA",
      phone1: "(555) 234-5678",
      phone2: "(555) 876-5432",
      stage: "Follow Up",
      assigned: "Study Bolt",
      avatar: "/placeholder.svg",
      disposition: "Very Interested"
    },
    {
      id: 3,
      firstName: "Robert",
      lastName: "Johnson",
      email: "robert.j@example.com",
      mailingAddress: "555 Cedar Ln, Anytown USA",
      propertyAddress: "777 Birch Rd, Somewhere USA",
      phone1: "(555) 345-6789",
      phone2: "(555) 987-6543",
      stage: "New Lead",
      assigned: "Study Bolt",
      avatar: "/placeholder.svg",
      disposition: "Needs Follow Up"
    },
    {
      id: 4,
      firstName: "Emily",
      lastName: "Wilson",
      email: "emily.w@example.com",
      mailingAddress: "888 Elm St, Anytown USA",
      propertyAddress: "999 Walnut Ave, Somewhere USA",
      phone1: "(555) 456-7890",
      phone2: "(555) 098-7654",
      stage: "Contacted",
      assigned: "Study Bolt",
      avatar: "/placeholder.svg",
      disposition: "Call Back"
    },
    {
      id: 5,
      firstName: "Michael",
      lastName: "Brown",
      email: "michael.b@example.com",
      mailingAddress: "111 Spruce St, Anytown USA",
      propertyAddress: "222 Fir Dr, Somewhere USA",
      phone1: "(555) 567-8901",
      phone2: "(555) 109-8765",
      stage: "Nurturing",
      assigned: "Study Bolt",
      avatar: "/placeholder.svg",
      disposition: "Not Interested"
    }
  ];

  const filteredLeads = leads.filter(lead => 
    `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone1.includes(searchTerm) ||
    lead.phone2.includes(searchTerm)
  );

  const toggleSelectLead = (id: number) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(leadId => leadId !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const selectAllLeads = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };

  const handleAddLead = () => {
    // This would navigate to a form to add a new lead
    console.log("Add new lead");
  };

  const handleNavigateToPowerDialer = () => {
    navigate("/power-dialer");
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "New Lead":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">New Lead</Badge>;
      case "Contacted":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Contacted</Badge>;
      case "Follow Up":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Follow Up</Badge>;
      case "Nurturing":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Nurturing</Badge>;
      default:
        return <Badge variant="outline">{stage}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">People</h1>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleNavigateToPowerDialer}>
              <Phone className="mr-2 h-4 w-4" />
              Power Dialer
            </Button>
            <Button onClick={handleAddLead}>
              <Plus className="mr-2 h-4 w-4" />
              Add Person
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Leads</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Leads</TabsTrigger>
                <TabsTrigger value="newLeads">New Leads</TabsTrigger>
                <TabsTrigger value="followUp">Follow Up</TabsTrigger>
                <TabsTrigger value="nurturing">Nurturing</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="pt-4">
                <div className="rounded-md border">
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 transition-colors">
                          <th className="h-12 px-4 text-left align-middle font-medium">
                            <Checkbox
                              checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                              onCheckedChange={selectAllLeads}
                            />
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Contact</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Property</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Disposition</th>
                          <th className="h-12 px-4 text-left align-middle font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.map(lead => (
                          <tr
                            key={lead.id}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <td className="p-4 align-middle">
                              <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={() => toggleSelectLead(lead.id)}
                              />
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8 mr-2">
                                  <User className="h-4 w-4" />
                                </Avatar>
                                <div>
                                  <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                                  <div className="text-xs text-muted-foreground">{lead.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              {getStageBadge(lead.stage)}
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="text-xs">{lead.phone1}</span>
                                </div>
                                <div className="flex items-center mt-1">
                                  <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="text-xs">{lead.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center">
                                <Home className="h-3 w-3 mr-1 text-muted-foreground" />
                                <span className="text-xs">{lead.propertyAddress}</span>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <span className="text-sm">{lead.disposition}</span>
                            </td>
                            <td className="p-4 align-middle">
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
              
              {/* Repeat similar structure for other tabs */}
              <TabsContent value="newLeads" className="pt-4">
                {/* Similar table structure for new leads */}
                <div className="rounded-md border">
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 transition-colors">
                          <th className="h-12 px-4 text-left align-middle font-medium">
                            <Checkbox />
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Contact</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Property</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Disposition</th>
                          <th className="h-12 px-4 text-left align-middle font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.filter(lead => lead.stage === "New Lead").map(lead => (
                          <tr
                            key={lead.id}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <td className="p-4 align-middle">
                              <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={() => toggleSelectLead(lead.id)}
                              />
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8 mr-2">
                                  <User className="h-4 w-4" />
                                </Avatar>
                                <div>
                                  <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                                  <div className="text-xs text-muted-foreground">{lead.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              {getStageBadge(lead.stage)}
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="text-xs">{lead.phone1}</span>
                                </div>
                                <div className="flex items-center mt-1">
                                  <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="text-xs">{lead.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center">
                                <Home className="h-3 w-3 mr-1 text-muted-foreground" />
                                <span className="text-xs">{lead.propertyAddress}</span>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <span className="text-sm">{lead.disposition}</span>
                            </td>
                            <td className="p-4 align-middle">
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="followUp" className="pt-4">
                {/* Similar table structure for follow up leads */}
                <div className="rounded-md border">
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 transition-colors">
                          <th className="h-12 px-4 text-left align-middle font-medium">
                            <Checkbox />
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Contact</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Property</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Disposition</th>
                          <th className="h-12 px-4 text-left align-middle font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.filter(lead => lead.stage === "Follow Up").map(lead => (
                          <tr
                            key={lead.id}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <td className="p-4 align-middle">
                              <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={() => toggleSelectLead(lead.id)}
                              />
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8 mr-2">
                                  <User className="h-4 w-4" />
                                </Avatar>
                                <div>
                                  <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                                  <div className="text-xs text-muted-foreground">{lead.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              {getStageBadge(lead.stage)}
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="text-xs">{lead.phone1}</span>
                                </div>
                                <div className="flex items-center mt-1">
                                  <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="text-xs">{lead.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center">
                                <Home className="h-3 w-3 mr-1 text-muted-foreground" />
                                <span className="text-xs">{lead.propertyAddress}</span>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <span className="text-sm">{lead.disposition}</span>
                            </td>
                            <td className="p-4 align-middle">
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="nurturing" className="pt-4">
                {/* Similar table structure for nurturing leads */}
                <div className="rounded-md border">
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50 transition-colors">
                          <th className="h-12 px-4 text-left align-middle font-medium">
                            <Checkbox />
                          </th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Contact</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Property</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Disposition</th>
                          <th className="h-12 px-4 text-left align-middle font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.filter(lead => lead.stage === "Nurturing").map(lead => (
                          <tr
                            key={lead.id}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <td className="p-4 align-middle">
                              <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={() => toggleSelectLead(lead.id)}
                              />
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8 mr-2">
                                  <User className="h-4 w-4" />
                                </Avatar>
                                <div>
                                  <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                                  <div className="text-xs text-muted-foreground">{lead.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              {getStageBadge(lead.stage)}
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="text-xs">{lead.phone1}</span>
                                </div>
                                <div className="flex items-center mt-1">
                                  <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <span className="text-xs">{lead.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <div className="flex items-center">
                                <Home className="h-3 w-3 mr-1 text-muted-foreground" />
                                <span className="text-xs">{lead.propertyAddress}</span>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              <span className="text-sm">{lead.disposition}</span>
                            </td>
                            <td className="p-4 align-middle">
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default People;
