import React, { useState, useCallback } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Filter, Plus, X, Upload, FileText } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import * as XLSX from "xlsx";

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
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importStep, setImportStep] = useState<"upload" | "mapping" | "importing">("upload");
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [importLoading, setImportLoading] = useState(false);

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

  const fieldMappingOptions = [
    { value: "firstName", label: "First Name" },
    { value: "lastName", label: "Last Name" },
    { value: "email", label: "Email" },
    { value: "mailingAddress", label: "Mailing Address" },
    { value: "propertyAddress", label: "Property Address" },
    { value: "phone1", label: "Primary Phone" },
    { value: "phone2", label: "Secondary Phone" },
    { value: "stage", label: "Stage" },
    { value: "assigned", label: "Assigned To" },
  ];

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

  const parseCSVFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const data = results.data;
          
          setParsedHeaders(headers);
          setParsedData(data);
          
          const mappings: Record<string, string> = {};
          headers.forEach(header => {
            const normalizedHeader = header.toLowerCase();
            
            if (normalizedHeader.includes("first") && normalizedHeader.includes("name")) {
              mappings[header] = "firstName";
            } else if (normalizedHeader.includes("last") && normalizedHeader.includes("name")) {
              mappings[header] = "lastName";
            } else if (normalizedHeader.includes("email")) {
              mappings[header] = "email";
            } else if (normalizedHeader.includes("mailing") || 
                     (normalizedHeader.includes("address") && !normalizedHeader.includes("property"))) {
              mappings[header] = "mailingAddress";
            } else if (normalizedHeader.includes("property")) {
              mappings[header] = "propertyAddress";
            } else if (normalizedHeader.includes("phone") || normalizedHeader.includes("mobile")) {
              if (!Object.values(mappings).includes("phone1")) {
                mappings[header] = "phone1";
              } else {
                mappings[header] = "phone2";
              }
            }
          });
          
          setColumnMappings(mappings);
          setImportStep("mapping");
          setIsDragging(false);
        } catch (error) {
          console.error("CSV parsing error:", error);
          toast.error("Failed to parse CSV file. Please check the file format.");
          setIsDragging(false);
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        toast.error("Failed to parse CSV file. Please check the file format.");
        setIsDragging(false);
      }
    });
  };
  
  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const headers = jsonData[0] as string[];
        
        const parsedRows = jsonData.slice(1).map(row => {
          const rowData: Record<string, any> = {};
          (row as any[]).forEach((cell, index) => {
            if (index < headers.length) {
              rowData[headers[index]] = cell;
            }
          });
          return rowData;
        });
        
        setParsedHeaders(headers);
        setParsedData(parsedRows);
        
        const mappings: Record<string, string> = {};
        headers.forEach(header => {
          const normalizedHeader = header.toLowerCase();
          
          if (normalizedHeader.includes("first") && normalizedHeader.includes("name")) {
            mappings[header] = "firstName";
          } else if (normalizedHeader.includes("last") && normalizedHeader.includes("name")) {
            mappings[header] = "lastName";
          } else if (normalizedHeader.includes("email")) {
            mappings[header] = "email";
          } else if (normalizedHeader.includes("mailing") || 
                   (normalizedHeader.includes("address") && !normalizedHeader.includes("property"))) {
            mappings[header] = "mailingAddress";
          } else if (normalizedHeader.includes("property")) {
            mappings[header] = "propertyAddress";
          } else if (normalizedHeader.includes("phone") || normalizedHeader.includes("mobile")) {
            if (!Object.values(mappings).includes("phone1")) {
              mappings[header] = "phone1";
            } else {
              mappings[header] = "phone2";
            }
          }
        });
        
        setColumnMappings(mappings);
        setImportStep("mapping");
        setIsDragging(false);
      } catch (error) {
        console.error("Excel parsing error:", error);
        toast.error("Failed to parse Excel file. Please check the file format.");
        setIsDragging(false);
      }
    };
    
    reader.onerror = () => {
      toast.error("Error reading file. Please try again.");
      setIsDragging(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    setImportedFile(file);
    
    if (fileType === 'csv') {
      parseCSVFile(file);
    } else if (['xlsx', 'xls', 'xlsb', 'xlsm'].includes(fileType || '')) {
      parseExcelFile(file);
    } else {
      toast.error("Unsupported file format. Please upload a CSV or Excel file.");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileType = file.name.split('.').pop()?.toLowerCase();
      
      setImportedFile(file);
      
      if (fileType === 'csv') {
        parseCSVFile(file);
      } else if (['xlsx', 'xls', 'xlsb', 'xlsm'].includes(fileType || '')) {
        parseExcelFile(file);
      } else {
        toast.error("Unsupported file format. Please upload a CSV or Excel file.");
      }
    }
  };

  const handleMappingChange = (header: string, value: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [header]: value
    }));
  };

  const importLeads = () => {
    setImportLoading(true);
    
    try {
      const transformedData = parsedData.map((row, index) => {
        const lead: Partial<LeadFormValues> & { id: number } = {
          id: leads.length + index + 1,
          stage: "Lead",
          assigned: "",
        };
        
        Object.entries(columnMappings).forEach(([header, field]) => {
          if (field && row[header] !== undefined) {
            (lead as any)[field] = row[header];
          }
        });
        
        return lead;
      });
      
      const validLeads = transformedData.filter(lead => 
        lead.firstName && lead.lastName && lead.email
      );
      
      if (validLeads.length === 0) {
        toast.error("No valid leads found in the imported file.");
        setImportLoading(false);
        return;
      }
      
      setLeads(prev => [...prev, ...validLeads]);
      
      setImportStep("upload");
      setParsedHeaders([]);
      setParsedData([]);
      setColumnMappings({});
      setImportedFile(null);
      setIsImportOpen(false);
      setImportLoading(false);
      
      toast.success(`Successfully imported ${validLeads.length} leads.`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import leads. Please try again.");
      setImportLoading(false);
    }
  };

  const cancelImport = () => {
    setImportStep("upload");
    setParsedHeaders([]);
    setParsedData([]);
    setColumnMappings({});
    setImportedFile(null);
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

      <Dialog open={isImportOpen} onOpenChange={(open) => {
        setIsImportOpen(open);
        if (!open) {
          cancelImport();
        }
      }}>
        <DialogContent className="sm:max-w-[700px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Import Leads</DialogTitle>
          </DialogHeader>
          
          {importStep === "upload" ? (
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDragging ? 'border-crm-blue bg-crm-lightBlue' : 'border-gray-300'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
            >
              <input 
                type="file" 
                id="fileInput" 
                accept=".csv,.xlsx,.xls,.xlsb,.xlsm"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Drag and drop your file here</h3>
              <p className="text-sm text-gray-500 mb-4">
                Supported file formats: .CSV, .XLS, .XLSX
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Your file should include the following columns:<br />
                First Name, Last Name, Email, Phone, Mailing Address, Property Address
              </p>
              <Button 
                onClick={() => document.getElementById("fileInput")?.click()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Browse Files
              </Button>
            </div>
          ) : importStep === "mapping" ? (
            <div className="space-y-6">
              <div className="bg-crm-lightBlue p-4 rounded-lg flex items-center gap-3">
                <FileText className="h-5 w-5 text-crm-blue" />
                <div className="flex-1">
                  <p className="font-medium">{importedFile?.name}</p>
                  <p className="text-sm text-gray-500">
                    {parsedData.length} leads found
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={cancelImport}
                  className="text-gray-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Map File Headers to Lead Fields</h3>
                <div className="max-h-[350px] overflow-y-auto pr-2">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="py-2 px-4 text-left text-sm font-medium text-gray-500">File Header</th>
                        <th className="py-2 px-4 text-left text-sm font-medium text-gray-500">Lead Field</th>
                        <th className="py-2 px-4 text-left text-sm font-medium text-gray-500">Sample Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parsedHeaders.map((header) => (
                        <tr key={header} className="hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm">{header}</td>
                          <td className="py-3 px-4">
                            <select
                              value={columnMappings[header] || ""}
                              onChange={(e) => handleMappingChange(header, e.target.value)}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            >
                              <option value="">-- Do not import --</option>
                              {fieldMappingOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500 truncate max-w-[200px]">
                            {parsedData[0] && parsedData[0][header] !== undefined
                              ? String(parsedData[0][header])
                              : "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
          
          <DialogFooter className="sm:justify-between flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline"
              className="rounded-lg"
              onClick={() => {
                if (importStep === "upload") {
                  setIsImportOpen(false);
                } else {
                  setImportStep("upload");
                }
              }}
            >
              {importStep === "upload" ? "Cancel" : "Back"}
            </Button>
            
            {importStep === "mapping" && (
              <Button 
                type="button"
                className="bg-crm-blue hover:bg-crm-blue/90 rounded-lg"
                onClick={importLeads}
                disabled={importLoading || Object.keys(columnMappings).length === 0}
              >
                {importLoading ? "Importing..." : "Import Leads"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default People;
