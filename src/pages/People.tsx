
import React, { useState, useCallback } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Filter, Plus, X, Upload } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Sample data for leads
const leadsData = [
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
  },
];

// Define the lead type for form submission
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
};

const People = () => {
  const [leads, setLeads] = useState(leadsData);
  const [customFields, setCustomFields] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
    },
  });

  const addCustomField = () => {
    const fieldName = prompt("Enter field name:");
    if (fieldName && fieldName.trim() !== "") {
      setCustomFields([...customFields, fieldName.trim()]);
    }
  };

  const onSubmit = (data: LeadFormValues) => {
    const newLead = {
      id: leads.length > 0 ? Math.max(...leads.map(lead => lead.id)) + 1 : 1,
      ...data
    };
    setLeads([...leads, newLead]);
    setIsAddLeadOpen(false);
    form.reset();
  };

  const handlePropertyAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value === "") {
      form.setValue("propertyAddress", form.getValues("mailingAddress"));
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const processCSVData = (content: string) => {
    try {
      const rows = content.split("\n");
      const headers = rows[0].split(",").map(h => h.trim());
      
      const requiredFields = ["firstName", "lastName", "email"];
      const missingFields = requiredFields.filter(field => {
        if (field === "firstName") {
          return !headers.some(header => 
            header.toLowerCase().includes("first") && header.toLowerCase().includes("name"));
        } else if (field === "lastName") {
          return !headers.some(header => 
            header.toLowerCase().includes("last") && header.toLowerCase().includes("name"));
        } else if (field === "email") {
          return !headers.some(header => 
            header.toLowerCase().includes("email"));
        }
        return true;
      });
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }
      
      const headerMap = {
        firstName: headers.findIndex(header => header.toLowerCase().includes("first") && header.toLowerCase().includes("name")),
        lastName: headers.findIndex(header => header.toLowerCase().includes("last") && header.toLowerCase().includes("name")),
        email: headers.findIndex(header => header.toLowerCase().includes("email")),
        mailingAddress: headers.findIndex(header => header.toLowerCase().includes("mailing") || header.toLowerCase().includes("address")),
        propertyAddress: headers.findIndex(header => header.toLowerCase().includes("property")),
        phone1: headers.findIndex(header => header.toLowerCase().includes("phone") || header.toLowerCase().includes("mobile")),
        phone2: headers.findIndex(header => header.toLowerCase().includes("phone2") || header.toLowerCase().includes("secondary")),
      };
      
      const importedLeads = [];
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        const columns = rows[i].split(",").map(col => col.trim());
        if (columns.length < 3) continue;
        
        const newLead = {
          id: leads.length + importedLeads.length + i,
          firstName: headerMap.firstName >= 0 ? columns[headerMap.firstName] : "",
          lastName: headerMap.lastName >= 0 ? columns[headerMap.lastName] : "",
          email: headerMap.email >= 0 ? columns[headerMap.email] : "",
          mailingAddress: headerMap.mailingAddress >= 0 ? columns[headerMap.mailingAddress] : "",
          propertyAddress: headerMap.propertyAddress >= 0 ? columns[headerMap.propertyAddress] : "",
          phone1: headerMap.phone1 >= 0 ? columns[headerMap.phone1] : "",
          phone2: headerMap.phone2 >= 0 ? columns[headerMap.phone2] : "",
          stage: "Lead",
          assigned: "",
        };
        
        importedLeads.push(newLead);
      }
      
      return importedLeads;
    } catch (error) {
      console.error("CSV parsing error:", error);
      throw error;
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType !== 'csv' && fileType !== 'xls' && fileType !== 'xlsx') {
      toast.error("Only CSV and Excel files are supported");
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) throw new Error("Failed to read file content");
        
        if (fileType === 'csv') {
          const importedLeads = processCSVData(content);
          
          if (importedLeads.length > 0) {
            setLeads(prevLeads => [...prevLeads, ...importedLeads]);
            setIsImportOpen(false);
            toast.success(`Successfully imported ${importedLeads.length} leads`);
          } else {
            toast.error("No valid leads found in the file");
          }
        } else {
          toast.error("Excel file processing is not implemented in this demo");
        }
      } catch (error) {
        toast.error(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };
    
    reader.onerror = () => {
      toast.error("Error reading file");
    };

    reader.readAsText(file);
  }, [leads]);

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
        </div>
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

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center bg-crm-lightBlue">
          <h2 className="font-medium text-gray-700">All Leads</h2>
          <div className="ml-auto">
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
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-crm-blue/10">
              <TableRow>
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
              {leads.length > 0 ? (
                leads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="hover:bg-crm-lightBlue transition-colors duration-200 cursor-pointer"
                  >
                    <TableCell>{lead.firstName}</TableCell>
                    <TableCell>{lead.lastName}</TableCell>
                    <TableCell>{lead.mailingAddress}</TableCell>
                    <TableCell>{lead.propertyAddress}</TableCell>
                    <TableCell>{lead.phone1}</TableCell>
                    <TableCell>{lead.phone2}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    {customFields.map((field, index) => (
                      <TableCell key={index}>-</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7 + customFields.length} className="text-center py-8 text-gray-500">
                    No leads found. Add your first lead to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
        <DialogContent className="sm:max-w-[600px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Import Leads</DialogTitle>
          </DialogHeader>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              isDragging ? 'border-crm-blue bg-crm-lightBlue' : 'border-gray-300'
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Drag and drop your file here</h3>
            <p className="text-sm text-gray-500 mb-4">
              Supported file formats: .CSV, .XLS, .XLSX
            </p>
            <p className="text-xs text-gray-400">
              Your file should include the following columns:<br />
              First Name, Last Name, Email, Phone, Mailing Address, Property Address
            </p>
          </div>
          
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
