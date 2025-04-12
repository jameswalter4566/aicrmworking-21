import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Plus, Check } from "lucide-react";

interface RealEstateOwnedFormProps {
  leadId: string;
  mortgageData?: any;
  onSave: (data: any) => void;
  isEditable?: boolean;
}

const propertyTypeOptions = [
  { value: "single_family", label: "Single Family Residence" },
  { value: "condo", label: "Condominium" },
  { value: "townhouse", label: "Townhouse" },
  { value: "multi_family", label: "Multi-Family Residence" },
  { value: "mobile_home", label: "Mobile Home" },
  { value: "co_op", label: "Co-op" },
  { value: "commercial", label: "Commercial" },
];

const occupancyOptions = [
  { value: "primary", label: "Primary Residence" },
  { value: "secondary", label: "Secondary Residence" },
  { value: "investment", label: "Investment Property" },
];

const statusOptions = [
  { value: "retained", label: "Retained" },
  { value: "pending_sale", label: "Pending Sale" },
  { value: "sold", label: "Sold" },
];

const formSchema = z.object({
  address1: z.string().min(1, "Address is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP Code is required"),
  country: z.string().min(1, "Country is required"),
  propertyType: z.string().min(1, "Property type is required"),
  unitNumber: z.string().optional(),
  marketValue: z.string().min(1, "Market value is required"),
  intendedOccupancy: z.string().min(1, "Intended occupancy is required"),
  isSubjectProperty: z.boolean().optional(),
  status: z.string().min(1, "Status is required"),
  owners: z.array(z.string()).optional(),
  primaryResidents: z.array(z.string()).optional(),
  isMixedUseProperty: z.enum(["yes", "no"]).optional(),
  associatedLiabilities: z.array(
    z.object({
      id: z.string(),
      isAssociated: z.boolean().optional(),
      creditor: z.string(),
      balance: z.string(),
      monthlyPayment: z.string(),
      address: z.string(),
      creditLimit: z.string(),
    })
  ).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const RealEstateOwnedForm = ({
  leadId,
  mortgageData = {},
  onSave,
  isEditable = true,
}: RealEateOwnedFormProps) => {
  const [activeTab, setActiveTab] = useState<string>("details");
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    if (mortgageData?.realEstateOwned) {
      setProperties(mortgageData.realEstateOwned.properties || []);
    }
  }, [mortgageData]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      propertyType: "",
      unitNumber: "",
      marketValue: "",
      intendedOccupancy: "primary",
      isSubjectProperty: false,
      status: "retained",
      owners: [],
      primaryResidents: [],
      isMixedUseProperty: "no",
      associatedLiabilities: [],
    },
  });

  const handleAddNewProperty = () => {
    setSelectedProperty(null);
    setIsEditing(true);
    form.reset({
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      propertyType: "",
      unitNumber: "",
      marketValue: "",
      intendedOccupancy: "primary",
      isSubjectProperty: false,
      status: "retained",
      owners: [],
      primaryResidents: [],
      isMixedUseProperty: "no",
      associatedLiabilities: [],
    });
  };

  const handleSelectProperty = (property: any) => {
    setSelectedProperty(property);
    setIsEditing(true);
    form.reset({
      address1: property.address1 || "",
      address2: property.address2 || "",
      city: property.city || "",
      state: property.state || "",
      zipCode: property.zipCode || "",
      country: property.country || "United States",
      propertyType: property.propertyType || "",
      unitNumber: property.unitNumber || "",
      marketValue: property.marketValue || "",
      intendedOccupancy: property.intendedOccupancy || "primary",
      isSubjectProperty: property.isSubjectProperty || false,
      status: property.status || "retained",
      owners: property.owners || [],
      primaryResidents: property.primaryResidents || [],
      isMixedUseProperty: property.isMixedUseProperty || "no",
      associatedLiabilities: property.associatedLiabilities || [],
    });
  };

  const onSubmit = (data: FormValues) => {
    const newProperty = {
      id: selectedProperty?.id || Date.now().toString(),
      ...data,
    };

    let updatedProperties;
    if (selectedProperty) {
      updatedProperties = properties.map((prop) =>
        prop.id === selectedProperty.id ? newProperty : prop
      );
    } else {
      updatedProperties = [...properties, newProperty];
    }

    setProperties(updatedProperties);
    setIsEditing(false);
    setSelectedProperty(null);

    onSave({
      section: "realEstateOwned",
      data: {
        realEstateOwned: {
          properties: updatedProperties,
        },
      },
    });
  };

  const handleDelete = () => {
    if (!selectedProperty) return;

    const updatedProperties = properties.filter(
      (prop) => prop.id !== selectedProperty.id
    );

    setProperties(updatedProperties);
    setIsEditing(false);
    setSelectedProperty(null);

    onSave({
      section: "realEstateOwned",
      data: {
        realEstateOwned: {
          properties: updatedProperties,
        },
      },
    });
  };

  const formatAddress = (property: any) => {
    return `${property.address1}${property.unitNumber ? ' #' + property.unitNumber : ''}`;
  };

  const formatCurrency = (value: string | number) => {
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    return !isNaN(numeric) ? `$${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
  };

  const people = [
    { id: "person1", name: "Rene Pastor" },
    { id: "person2", name: "Iohana Tapia Garcia" },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-mortgage-darkPurple">
          Real Estate Owned
        </h3>
        <Button 
          onClick={handleAddNewProperty}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700"
          disabled={!isEditable || isEditing}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Real Estate
        </Button>
      </div>

      {properties.length > 0 && !isEditing && (
        <div className="mb-6 overflow-x-auto">
          <Table className="border">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableHead className="font-bold">ADDRESS</TableHead>
                <TableHead className="font-bold">DISPOSITION</TableHead>
                <TableHead className="font-bold">TYPE</TableHead>
                <TableHead className="font-bold text-center">SUBJECT PROPERTY</TableHead>
                <TableHead className="font-bold text-right">MARKET VALUE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow 
                  key={property.id} 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSelectProperty(property)}
                >
                  <TableCell>{formatAddress(property)}</TableCell>
                  <TableCell>
                    {statusOptions.find(s => s.value === property.status)?.label || property.status}
                  </TableCell>
                  <TableCell>
                    {propertyTypeOptions.find(t => t.value === property.propertyType)?.label || property.propertyType}
                  </TableCell>
                  <TableCell className="text-center">
                    {property.isSubjectProperty ? "Yes" : "No"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(property.marketValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="details">REAL ESTATE DETAILS</TabsTrigger>
                <TabsTrigger value="rental">RENTAL INCOME & PROPERTY EXPENSES</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <FormField
                      control={form.control}
                      name="isSubjectProperty"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-medium">Subject Property</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <FormLabel className="font-medium">Real Estate Owners:</FormLabel>
                    {people.map((person) => (
                      <div key={person.id} className="flex items-center mt-2">
                        <FormField
                          control={form.control}
                          name="owners"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(person.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    const newValue = checked 
                                      ? [...current, person.id]
                                      : current.filter(id => id !== person.id);
                                    field.onChange(newValue);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{person.name}</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <FormLabel className="font-medium">Borrower(S) Using This As Primary Address:</FormLabel>
                    {people.map((person) => (
                      <div key={person.id} className="flex items-center mt-2">
                        <FormField
                          control={form.control}
                          name="primaryResidents"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(person.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    const newValue = checked 
                                      ? [...current, person.id]
                                      : current.filter(id => id !== person.id);
                                    field.onChange(newValue);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{person.name}</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1 *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unitNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit #</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter unit number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 2</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter additional address info" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="intendedOccupancy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intended Occupancy *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select occupancy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {occupancyOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="AL">Alabama</SelectItem>
                            <SelectItem value="AK">Alaska</SelectItem>
                            <SelectItem value="AZ">Arizona</SelectItem>
                            <SelectItem value="AR">Arkansas</SelectItem>
                            <SelectItem value="CA">California</SelectItem>
                            {/* More states would be added here */}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter ZIP code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="Mexico">Mexico</SelectItem>
                          {/* More countries would be added here */}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="marketValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Market Value *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5">$</span>
                            <Input 
                              type="text" 
                              placeholder="0.00" 
                              className="pl-7"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {propertyTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormLabel>Mixed Use Property:</FormLabel>
                  <p className="text-sm text-gray-600 mb-2">
                    If you will occupy the property, will you set aside space within the property to operate your own business?
                    <br />(e.g., daycare facility, medical office, beauty/barber shop)
                  </p>
                  <FormField
                    control={form.control}
                    name="isMixedUseProperty"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-6"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="yes" />
                              </FormControl>
                              <FormLabel>Yes</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="no" />
                              </FormControl>
                              <FormLabel>No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2">Associated Liabilities</h4>
                  <Table className="border">
                    <TableHeader className="bg-gray-200">
                      <TableRow>
                        <TableHead className="w-[80px] text-center">ASSOCIATED</TableHead>
                        <TableHead>CREDITOR</TableHead>
                        <TableHead>BALANCE</TableHead>
                        <TableHead>MONTHLY PAYMENT</TableHead>
                        <TableHead>ADDRESS</TableHead>
                        <TableHead>CREDIT LIMIT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.watch('associatedLiabilities')?.map((liability, index) => (
                        <TableRow key={liability.id}>
                          <TableCell className="text-center">
                            <FormField
                              control={form.control}
                              name={`associatedLiabilities.${index}.isAssociated`}
                              render={({ field }) => (
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    form.setValue(`associatedLiabilities.${index}.isAssociated`, checked);
                                  }}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>{liability.creditor}</TableCell>
                          <TableCell>{liability.balance}</TableCell>
                          <TableCell>{liability.monthlyPayment}</TableCell>
                          <TableCell>{liability.address}</TableCell>
                          <TableCell>{liability.creditLimit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="rental" className="space-y-4 pt-4">
                <p className="text-gray-600">
                  This tab would contain fields for rental income and property expenses.
                  This section is not implemented in this version.
                </p>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2">
              {selectedProperty && (
                <Button 
                  type="button" 
                  onClick={handleDelete} 
                  variant="destructive" 
                  className="bg-red-500 hover:bg-red-600"
                >
                  DELETE
                </Button>
              )}
              <Button 
                type="button" 
                onClick={() => {
                  setIsEditing(false);
                  setSelectedProperty(null);
                }} 
                variant="outline"
              >
                CANCEL
              </Button>
              <Button type="submit">SAVE</Button>
              <Button 
                type="submit" 
                className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
                onClick={() => {
                  form.handleSubmit(onSubmit)();
                  handleAddNewProperty();
                }}
              >
                SAVE & ADD
              </Button>
            </div>
          </form>
        </Form>
      )}

      {!isEditing && properties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-md">
          <p className="text-gray-500 mb-4">No real estate properties have been added yet.</p>
          <Button 
            onClick={handleAddNewProperty}
            disabled={!isEditable}
            className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Real Estate
          </Button>
        </div>
      )}
    </div>
  );
};
