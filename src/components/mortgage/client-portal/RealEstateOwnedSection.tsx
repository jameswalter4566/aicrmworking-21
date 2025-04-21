
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Property {
  id: string;
  address: string;
  propertyType: string;
  marketValue: string;
  ownership: string;
  isPrimary: boolean;
  mortgageBalance: string;
  monthlyPayment: string;
  rentalIncome: string;
}

const propertyTypes = [
  "Single Family",
  "Condominium",
  "Townhouse",
  "Multi-Family (2-4 units)",
  "Multi-Family (5+ units)",
  "Commercial",
  "Land",
  "Other"
];

const ownershipTypes = [
  "Solely Owned",
  "Jointly with Spouse",
  "Jointly with Others"
];

const RealEstateOwnedSection: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [leadId, setLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<Property[]>([{
    id: "property-0",
    address: "",
    propertyType: "",
    marketValue: "",
    ownership: "",
    isPrimary: false,
    mortgageBalance: "",
    monthlyPayment: "",
    rentalIncome: ""
  }]);
  
  useEffect(() => {
    if (!slug || !token) return;
    
    const fetchRealEstateData = async () => {
      try {
        setLoading(true);
        // Get lead ID from portal access
        const { data: portalData, error: portalError } = await supabase
          .from('client_portal_access')
          .select('lead_id')
          .eq('portal_slug', slug)
          .eq('access_token', token)
          .single();
        
        if (portalError || !portalData?.lead_id) {
          console.error("Error fetching portal access:", portalError);
          return;
        }
        
        setLeadId(portalData.lead_id.toString());
        
        // Get lead data
        const { data: response, error: profileError } = await supabase.functions.invoke('lead-profile', {
          body: { id: portalData.lead_id }
        });

        if (profileError || !response.success || !response.data.lead) {
          console.error("Error fetching lead data:", profileError || response.error);
          return;
        }
        
        const lead = response.data.lead;
        const mortgageData = lead.mortgageData || {};
        const realEstateData = mortgageData.realestate?.properties || [];
        
        if (Array.isArray(realEstateData) && realEstateData.length > 0) {
          const formattedProperties = realEstateData.map((prop: any, index: number) => ({
            id: `property-${index}`,
            address: prop.address || "",
            propertyType: prop.propertyType || "",
            marketValue: prop.marketValue?.toString() || "",
            ownership: prop.ownership || "",
            isPrimary: prop.isPrimary || false,
            mortgageBalance: prop.mortgageBalance?.toString() || "",
            monthlyPayment: prop.monthlyPayment?.toString() || "",
            rentalIncome: prop.rentalIncome?.toString() || ""
          }));
          setProperties(formattedProperties);
        }
      } catch (error) {
        console.error("Error in fetchRealEstateData:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRealEstateData();
  }, [slug, token]);

  const handleAddProperty = () => {
    const newId = `property-${properties.length}`;
    setProperties([...properties, {
      id: newId,
      address: "",
      propertyType: "",
      marketValue: "",
      ownership: "",
      isPrimary: false,
      mortgageBalance: "",
      monthlyPayment: "",
      rentalIncome: ""
    }]);
  };

  const handleRemoveProperty = (id: string) => {
    if (properties.length <= 1) return;
    setProperties(properties.filter(property => property.id !== id));
  };

  const handlePropertyChange = (id: string, field: keyof Property, value: any) => {
    setProperties(properties.map(property => 
      property.id === id ? { ...property, [field]: value } : property
    ));
  };
  
  const handleSave = async () => {
    if (!leadId) {
      toast.error("Cannot save: Lead ID is missing");
      return;
    }
    
    try {
      setSaving(true);
      
      // Format properties for saving
      const formattedProperties = properties.filter(prop => 
        prop.address || prop.propertyType || prop.marketValue || prop.ownership
      ).map(prop => ({
        address: prop.address,
        propertyType: prop.propertyType,
        marketValue: prop.marketValue,
        ownership: prop.ownership,
        isPrimary: prop.isPrimary,
        mortgageBalance: prop.mortgageBalance,
        monthlyPayment: prop.monthlyPayment,
        rentalIncome: prop.rentalIncome
      }));
      
      const mortgageData = {
        realestate: {
          properties: formattedProperties
        }
      };
      
      const { data, error } = await supabase.functions.invoke('update-lead', {
        body: { 
          leadId: leadId,
          leadData: { mortgageData }
        }
      });
      
      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Failed to update real estate information");
      }
      
      toast.success("Real estate information saved successfully");
    } catch (error) {
      console.error("Error saving real estate information:", error);
      toast.error("Failed to save real estate information");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-mortgage-darkPurple">Real Estate Owned</CardTitle>
        <CardDescription>
          List all properties you currently own, including your primary residence and any investment properties
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {properties.map((property) => (
          <div key={property.id} className="border rounded-md p-4 bg-gray-50/80">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Property Information</h3>
              {properties.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveProperty(property.id)}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>

            <div className="mb-4">
              <Label htmlFor={`address-${property.id}`}>Property Address</Label>
              <Input
                id={`address-${property.id}`}
                placeholder="Full property address"
                value={property.address}
                onChange={(e) => handlePropertyChange(property.id, "address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`type-${property.id}`}>Property Type</Label>
                <Select
                  value={property.propertyType}
                  onValueChange={(value) => handlePropertyChange(property.id, "propertyType", value)}
                >
                  <SelectTrigger id={`type-${property.id}`}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`value-${property.id}`}>Market Value</Label>
                <Input
                  id={`value-${property.id}`}
                  placeholder="$ Amount"
                  value={property.marketValue}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    handlePropertyChange(property.id, "marketValue", value);
                  }}
                  prefix="$"
                />
              </div>

              <div>
                <Label htmlFor={`ownership-${property.id}`}>Ownership</Label>
                <Select
                  value={property.ownership}
                  onValueChange={(value) => handlePropertyChange(property.id, "ownership", value)}
                >
                  <SelectTrigger id={`ownership-${property.id}`}>
                    <SelectValue placeholder="Ownership type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownershipTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center">
              <Checkbox 
                id={`primary-${property.id}`} 
                checked={property.isPrimary}
                onCheckedChange={(checked) => handlePropertyChange(property.id, "isPrimary", !!checked)}
              />
              <Label htmlFor={`primary-${property.id}`} className="ml-2">
                This is my primary residence
              </Label>
            </div>

            <Separator className="my-4" />

            <h4 className="font-medium mb-3">Mortgage & Income Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`balance-${property.id}`}>Mortgage Balance</Label>
                <Input
                  id={`balance-${property.id}`}
                  placeholder="$ Amount"
                  value={property.mortgageBalance}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    handlePropertyChange(property.id, "mortgageBalance", value);
                  }}
                  prefix="$"
                />
              </div>

              <div>
                <Label htmlFor={`payment-${property.id}`}>Monthly Payment</Label>
                <Input
                  id={`payment-${property.id}`}
                  placeholder="$ Amount"
                  value={property.monthlyPayment}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    handlePropertyChange(property.id, "monthlyPayment", value);
                  }}
                  prefix="$"
                />
              </div>

              <div>
                <Label htmlFor={`rental-${property.id}`}>Monthly Rental Income</Label>
                <Input
                  id={`rental-${property.id}`}
                  placeholder="$ Amount"
                  value={property.rentalIncome}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    handlePropertyChange(property.id, "rentalIncome", value);
                  }}
                  prefix="$"
                />
                <p className="text-xs text-gray-500 mt-1">If applicable</p>
              </div>
            </div>
          </div>
        ))}

        <Button 
          variant="outline" 
          className="w-full border-dashed border-gray-300 hover:border-gray-400"
          onClick={handleAddProperty}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Property
        </Button>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Real Estate Information'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealEstateOwnedSection;
