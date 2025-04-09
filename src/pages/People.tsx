import React, { useState, useCallback, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Filter, Plus, Upload, ChevronDown, Check, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  ToggleGroup, 
  ToggleGroupItem 
} from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import IntelligentFileUpload from "@/components/IntelligentFileUpload";
import { Progress } from "@/components/ui/progress";
import { thoughtlyService } from "@/services/thoughtly";
import { supabase } from "@/integrations/supabase/client";

const sampleLeadsData = [
  {
    id: 1,
    firstName: "Dan",
    lastName: "Corkill",
    email: "hi@followupboss.com",
    mailingAddress: "123 Main St, San Francisco, CA",
    propertyAddress: "456 Market St, San Francisco, CA",
    phone1: "(218) 304-6145",
    phone2: "",
    stage: "Lead",
    assigned: "study bolt",
    avatar: "",
    disposition: "Not Contacted",
  },
  {
    id: 2,
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
  },
  {
    id: 3,
    firstName: "Robert",
    lastName: "Smith",
    email: "robert@example.com",
    mailingAddress: "555 Cedar Ln, Los Angeles, CA",
    propertyAddress: "Same as mailing",
    phone1: "(555) 987-6543",
    phone2: "",
    stage: "Client",
    assigned: "john sales",
    avatar: "",
    disposition: "Appointment Set",
  },
];

const dispositionTypes = [
  "All Leads",
  "Not Contacted",
  "Contacted",
  "Appointment Set",
  "Submitted",
  "Dead",
  "DNC"
];

const dispositionColors = {
  "Not Contacted": "bg-gray-100 text-gray-800 hover:bg-gray-200",
  "Contacted": "bg-blue-100 text-blue-800 hover:bg-blue-200",
  "Appointment Set": "bg-purple-100 text-purple-800 hover:bg-purple-200",
  "Submitted": "bg-green-100 text-green-800 hover:bg-green-200",
  "Dead": "bg-red-100 text-red-800 hover:bg-red-200",
  "DNC": "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
};

type LeadFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  mailingAddress: string;
  propertyAddress: string;
  phone1: string;
  phone2: string;
  stage: string;
  assigned: string;
  disposition: string;
};

const People = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeDisposition, setActiveDisposition] = useState("All Leads");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiResponse, setApiResponse] = useState<any>(null);

  const form = useForm<LeadFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      mailingAddress: "",
      propertyAddress: "",
      phone1: "",
      phone2: "",
      stage: "Lead",
      assigned: "",
      disposition: "Not Contacted",
    },
  });

  useEffect(() => {
    const fetchLeads = async () => {
      setIsLoading(true);
      try {
        const response = await thoughtlyService.retrieveLeads();
        console.log("API Response:", response);
        
        if (response && response.data) {
          setLeads(response.data || []);
          setApiResponse(response);
        } else if (response && Array.isArray(response)) {
          setLeads(response);
          setApiResponse({ data: response, metadata: { totalLeadCount: response.length } });
        } else {
          console.warn("Unexpected response format:", response);
          setLeads(sampleLeadsData);
          setApiResponse({ 
            success: false, 
            data: sampleLeadsData,
            metadata: { 
              note: "Using sample data due to unexpected API response format",
              totalLeadCount: sampleLeadsData.length
            }
          });
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
        toast.error("Failed to load leads. Using sample data instead.");
        setLeads(sampleLeadsData);
        setApiResponse({ 
          success: false, 
          error: String(error),
          data: sampleLeadsData,
          metadata: { 
            note: "Using sample data due to API error",
            totalLeadCount: sampleLeadsData.length
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, []);

  useEffect(() => {
    if (apiResponse) {
      console.log("API Response State:", apiResponse);
      console.log("Leads State:", leads);
    }
  }, [apiResponse, leads]);

  const refreshLeads = async () => {
    toast.info("Refreshing leads...");
    try {
      const response = await thoughtlyService.retrieveLeads();
      if (response && response.data) {
        setLeads(response.data);
        setApiResponse(response);
        toast.success(`Retrieved ${response.data.length} leads`);
      } else if (response && Array.isArray(response)) {
        setLeads(response);
        toast.success(`Retrieved ${response.length} leads`);
      } else {
        toast.error("Unexpected API response format");
      }
    } catch (error) {
      console.error("Error refreshing leads:", error);
      toast.error("Failed to refresh leads");
    }
  };

  const filteredLeads = leads.filter(lead => {
    const dispositionMatch = activeDisposition === "All Leads" || lead.disposition === activeDisposition;
    
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const searchMatch = 
        (lead.firstName?.toLowerCase().includes(term) || false) ||
        (lead.lastName?.toLowerCase().includes(term) || false) ||
        (lead.email?.toLowerCase().includes(term) || false) ||
        (lead.phone1?.includes(term) || false);
      return dispositionMatch && searchMatch;
    }
    
    return dispositionMatch;
  });

  const updateLeadDisposition = (leadId: number | number[], newDisposition: string) => {
    if (Array.isArray(leadId)) {
      if (leadId.length === 0) {
        toast.error("No leads selected");
        return;
      }
      
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          leadId.includes(lead.id) ? { ...lead, disposition: newDisposition } : lead
        )
      );
      toast.success(`${leadId.length} leads updated to ${newDisposition}`);
    } else {
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, disposition: newDisposition } : lead
        )
      );
      toast.success(`Lead disposition updated to ${newDisposition}`);
    }
  };

  const handleSelectAllLeads = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: number, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const isAllSelected = filteredLeads.length > 0 && filteredLeads.every(lead => 
    selectedLeads.includes(lead.id)
  );

  const bulkUpdateDisposition = (newDisposition: string) => {
    updateLeadDisposition(selectedLeads, newDisposition);
    setSelectedLeads([]);
  };

  const getDispositionClass = (disposition: string) => {
    switch(disposition) {
      case "Not Contacted":
        return "disposition-not-contacted";
      case "Contacted":
        return "disposition-contacted";
      case "Appointment Set":
        return "disposition-appointment";
      case "Submitted":
        return "disposition-submitted";
      case "Dead":
        return "disposition-dead";
      case "DNC":
        return "disposition-dnc";
      default:
        return "disposition-not-contacted";
    }
  };

  const addCustomField = () => {
    const fieldName = prompt("Enter field name:");
    if (fieldName && fieldName.trim() !== "") {
      setCustomFields([...customFields, fieldName.trim()]);
    }
  };

  const onSubmit = async (data: LeadFormValues) => {
    const newLead = {
      id: leads.length > 0 ? Math.max(...leads.map(lead => lead.id || 0)) + 1 : 1,
      ...data,
      avatar: "",
    };

    try {
      const response = await fetch(
        "https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/store-leads",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leads: [newLead],
            leadType: "custom"
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(errorData.error || "Failed to store lead");
      }
      
      const responseData = await response.json();
      console.log("API success response:", responseData);
      
      setLeads([...leads, newLead]);
      setIsAddLeadOpen(false);
      form.reset();
      toast.success("Lead added successfully");
    } catch (error) {
      console.error("Failed to add lead:", error);
      toast.error("Failed to add lead. Please try again.");
    }
  };

  const handlePropertyAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value === "") {
      form.setValue("propertyAddress", form.getValues("mailingAddress"));
    }
  };

  const handleImportComplete = async (importedLeads: any[]) => {
    if (importedLeads.length > 0) {
      try {
        setLeads(prevLeads => [...prevLeads, ...importedLeads]);
        toast.success(`Successfully imported ${importedLeads.length} leads`);
        setTimeout(() => {
          setIsImportOpen(false);
        }, 1500);
      } catch (error) {
        console.error("Failed to import leads:", error);
        toast.error("Failed to import leads. Please try again.");
      }
    } else {
      toast.error("No valid leads found in the file");
    }
  };

  const sortLeadsByDisposition = () => {
    const sortedLeads = [...leads].sort((a, b) => {
      return a.disposition.localeCompare(b.disposition);
    });
    setLeads(sortedLeads);
    toast.success("Leads sorted by disposition");
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex gap-3">
          <Button 
            className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg"
            onClick={() => setIsAddLeadOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
          <Button 
            className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Lead List
          </Button>
          <Button
            variant="outline"
            onClick={refreshLeads}
            className="rounded-lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {apiResponse && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
          <details>
            <summary className="font-medium text-blue-700 cursor-pointer">
              API Response Info (Debug)
            </summary>
            <div className="mt-2 text-xs overflow-auto max-h-40 bg-white p-2 rounded">
              <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
            </div>
          </details>
        </div>
      )}

      <div className="disposition-filters">
        {dispositionTypes.map((disposition) => (
          <button
            key={disposition}
            className={`disposition-filter-button ${activeDisposition === disposition ? 'active' : ''}`}
            onClick={() => setActiveDisposition(disposition)}
          >
            {disposition}
          </button>
        ))}
      </div>

      <div className="flex space-x-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search leads..."
            className="pl-10 w-full rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="flex items-center rounded-lg">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {selectedLeads.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-start gap-4">
          <span className="text-sm font-medium text-gray-700">
            {selectedLeads.length} {selectedLeads.length === 1 ? 'lead' : 'leads'} selected
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg">
                Set Disposition <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {dispositionTypes.filter(d => d !== "All Leads").map((disposition) => (
                <DropdownMenuItem 
                  key={disposition}
                  onClick={() => bulkUpdateDisposition(disposition)}
                  className={dispositionColors[disposition as keyof typeof dispositionColors]}
                >
                  {disposition}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-lg"
            onClick={() => setSelectedLeads([])}
          >
            Clear Selection
          </Button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-crm-lightBlue">
          <h2 className="font-medium text-gray-700">
            {isLoading ? 'Loading...' : `All Leads (${filteredLeads.length})`}
            {apiResponse?.metadata && (
              <span className="text-xs text-gray-500 ml-2">
                Total in DB: {apiResponse.metadata.totalLeadCount || 0}
              </span>
            )}
          </h2>
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-gray-700 rounded-lg"
              onClick={addCustomField}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mb-4"></div>
            <p className="text-gray-500">Loading leads...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-crm-blue/10">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAllLeads}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center cursor-pointer focus:outline-none group">
                        <span>Disposition</span>
                        <ChevronDown className="ml-2 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48 bg-white">
                        <DropdownMenuItem onClick={sortLeadsByDisposition}>
                          Sort by Disposition
                        </DropdownMenuItem>
                        {dispositionTypes.filter(d => d !== "All Leads").map((disposition) => (
                          <DropdownMenuItem 
                            key={disposition}
                            onClick={() => setActiveDisposition(disposition)}
                            className={dispositionColors[disposition as keyof typeof dispositionColors]}
                          >
                            {disposition}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead>Avatar</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Mailing Address</TableHead>
                  <TableHead>Property Address</TableHead>
                  <TableHead>Primary Phone</TableHead>
                  <TableHead>Secondary Phone</TableHead>
                  <TableHead>Email</TableHead>
                  {customFields.map((field, index) => (
                    <TableHead key={index}>{field}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="hover:bg-crm-lightBlue transition-all duration-200 cursor-pointer my-4 shadow-sm hover:shadow-md hover:scale-[1.01]"
                    >
                      <TableCell>
                        <Checkbox 
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                          aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="p-0 h-auto">
                              <Badge className={`disposition-badge ${getDispositionClass(lead.disposition)}`}>
                                {lead.disposition}
                              </Badge>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2">
                            <div className="flex flex-col space-y-1">
                              {dispositionTypes.filter(d => d !== "All Leads").map((disposition) => (
                                <Button 
                                  key={disposition}
                                  variant="ghost" 
                                  className={`justify-start text-sm ${dispositionColors[disposition as keyof typeof dispositionColors]}`}
                                  onClick={() => updateLeadDisposition(lead.id, disposition)}
                                >
                                  {disposition}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          {lead.avatar ? (
                            <AvatarImage src={lead.avatar} alt={`${lead.firstName} ${lead.lastName}`} />
                          ) : (
                            <AvatarFallback className="bg-crm-lightBlue text-crm-blue">
                              {lead.firstName?.charAt(0) || '?'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </TableCell>
                      <TableCell>{lead.firstName || '-'}</TableCell>
                      <TableCell>{lead.lastName || '-'}</TableCell>
                      <TableCell>{lead.mailingAddress || '-'}</TableCell>
                      <TableCell>{lead.propertyAddress || '-'}</TableCell>
                      <TableCell>{lead.phone1 || '-'}</TableCell>
                      <TableCell>{lead.phone2 || '-'}</TableCell>
                      <TableCell>{lead.email || '-'}</TableCell>
                      {customFields.map((field, index) => (
                        <TableCell key={index}>-</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11 + customFields.length} className="text-center py-8 text-gray-500">
                      No leads found. {leads.length > 0 ? 'Try changing your filters.' : 'Add your first lead to get started.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Lead</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} className="rounded-lg" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} className="rounded-lg" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} className="rounded-lg" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} className="rounded-lg" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(Optional)" {...field} className="rounded-lg" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="disposition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disposition</FormLabel>
                    <FormControl>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-lg" 
                        {...field}
                      >
                        {dispositionTypes.filter(d => d !== "All Leads").map((disposition) => (
                          <option key={disposition} value={disposition}>
                            {disposition}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mailingAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mailing Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 Main St, City, State, Zip" 
                        {...field} 
                        className="rounded-lg"
                        onBlur={(e) => {
                          field.onBlur();
                          const propertyAddress = form.getValues("propertyAddress");
                          if (!propertyAddress) {
                            form.setValue("propertyAddress", e.target.value);
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propertyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Same as mailing address or different" 
                        {...field} 
                        className="rounded-lg"
                        onChange={(e) => {
                          field.onChange(e);
                          handlePropertyAddressChange(e);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-crm-blue focus:ring-crm-blue"
                    onChange={(e) => {
                      if (e.target.checked) {
                        form.setValue("propertyAddress", form.getValues("mailingAddress"));
                      }
                    }}
                  />
                  <span className="text-sm text-gray-600">Same as mailing address</span>
                </label>
              </div>

              <DialogFooter className="sm:justify-between flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => setIsAddLeadOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg"
                >
                  Add Lead
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Import Leads</DialogTitle>
          </DialogHeader>
          
          <IntelligentFileUpload onImportComplete={handleImportComplete} />
          
          <DialogFooter className="sm:justify-between flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline"
              className="rounded-lg"
              onClick={() => setIsImportOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default People;
