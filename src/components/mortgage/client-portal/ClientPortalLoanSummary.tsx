
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const loanTypes = [
  "Conventional",
  "FHA",
  "VA",
  "USDA",
  "Jumbo",
  "Non-QM",
  "Other"
];

const loanTerms = [
  "30 Year Fixed",
  "15 Year Fixed",
  "20 Year Fixed",
  "10 Year Fixed",
  "7/1 ARM",
  "5/1 ARM",
  "3/1 ARM"
];

const loanPurposes = [
  "Purchase",
  "Refinance - Rate/Term",
  "Refinance - Cash Out",
  "Home Equity",
  "Construction"
];

const propertyTypes = [
  "Single Family",
  "Condominium",
  "Townhouse",
  "Multi-Family (2-4 units)",
  "Multi-Family (5+ units)",
  "Manufactured Home",
  "Other"
];

const propertyUses = [
  "Primary residence",
  "Second home",
  "Investment property"
];

const ClientPortalLoanSummary: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [leadId, setLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Loan information
    loanType: "",
    loanAmount: "",
    loanTerm: "",
    purpose: "",
    interestRate: "",
    estimatedClosingDate: "",
    
    // Property information
    propertyAddress: "",
    propertyCity: "",
    propertyState: "",
    propertyZip: "",
    propertyType: "",
    propertyUse: "",
    propertyValue: "",
    downPayment: "",
    isNewPurchase: true
  });
  
  useEffect(() => {
    if (!slug || !token) return;
    
    const fetchLoanData = async () => {
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
        const loanData = mortgageData.loan || {};
        const propertyData = mortgageData.property || {};
        
        // Split the property address if it exists
        let propertyAddress = lead.propertyAddress || "";
        let propertyCity = "";
        let propertyState = "";
        let propertyZip = "";
        
        if (propertyAddress) {
          const parts = propertyAddress.split(',');
          if (parts.length >= 1) propertyAddress = parts[0].trim();
          if (parts.length >= 2) {
            const cityPart = parts[1].trim();
            propertyCity = cityPart;
            
            // Try to extract state and zip if in "City, ST 12345" format
            if (parts.length >= 3) {
              const stateZipPart = parts[2].trim();
              const stateZipMatch = stateZipPart.match(/([A-Z]{2})\s*(\d{5})?/);
              if (stateZipMatch) {
                propertyState = stateZipMatch[1];
                propertyZip = stateZipMatch[2] || "";
              }
            }
          }
        }
        
        setFormData({
          loanType: loanData.loanType || "",
          loanAmount: loanData.loanAmount || "",
          loanTerm: loanData.mortgageTerm || "",
          purpose: loanData.purpose || "",
          interestRate: loanData.interestRate || "",
          estimatedClosingDate: loanData.closingDate || "",
          
          propertyAddress: propertyAddress || "",
          propertyCity: propertyCity || "",
          propertyState: propertyState || "",
          propertyZip: propertyZip || "",
          propertyType: propertyData.propertyType || "",
          propertyUse: propertyData.occupancy || "",
          propertyValue: propertyData.propertyValue || "",
          downPayment: propertyData.downPayment || "",
          isNewPurchase: propertyData.isNewPurchase || true
        });
      } catch (error) {
        console.error("Error in fetchLoanData:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLoanData();
  }, [slug, token]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleSave = async () => {
    if (!leadId) {
      toast.error("Cannot save: Lead ID is missing");
      return;
    }
    
    try {
      setSaving(true);
      
      // Format loan and property data for saving
      const mortgageData = {
        loan: {
          loanType: formData.loanType,
          loanAmount: formData.loanAmount,
          mortgageTerm: formData.loanTerm,
          purpose: formData.purpose,
          interestRate: formData.interestRate,
          closingDate: formData.estimatedClosingDate
        },
        property: {
          propertyType: formData.propertyType,
          occupancy: formData.propertyUse,
          propertyValue: formData.propertyValue,
          downPayment: formData.downPayment,
          isNewPurchase: formData.isNewPurchase
        }
      };
      
      // Format property address
      const propertyAddress = `${formData.propertyAddress}, ${formData.propertyCity}, ${formData.propertyState} ${formData.propertyZip}`.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
      
      const { data, error } = await supabase.functions.invoke('update-lead', {
        body: { 
          leadId: leadId,
          leadData: { 
            propertyAddress,
            mortgageData 
          }
        }
      });
      
      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Failed to update loan information");
      }
      
      toast.success("Loan information saved successfully");
    } catch (error) {
      console.error("Error saving loan information:", error);
      toast.error("Failed to save loan information");
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
        <CardTitle className="text-mortgage-darkPurple">Loan Summary</CardTitle>
        <CardDescription>
          Review and update details about your mortgage loan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-mortgage-darkPurple mb-3">Loan Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purpose">Loan Purpose</Label>
              <Select 
                value={formData.purpose} 
                onValueChange={(value) => handleSelectChange("purpose", value)}
              >
                <SelectTrigger id="purpose">
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {loanPurposes.map(purpose => (
                    <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="loanType">Loan Type</Label>
              <Select 
                value={formData.loanType} 
                onValueChange={(value) => handleSelectChange("loanType", value)}
              >
                <SelectTrigger id="loanType">
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  {loanTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="loanAmount">Loan Amount</Label>
              <Input
                id="loanAmount"
                name="loanAmount"
                placeholder="$ Amount"
                value={formData.loanAmount}
                onChange={handleInputChange}
                prefix="$"
              />
            </div>
            
            <div>
              <Label htmlFor="loanTerm">Loan Term</Label>
              <Select 
                value={formData.loanTerm} 
                onValueChange={(value) => handleSelectChange("loanTerm", value)}
              >
                <SelectTrigger id="loanTerm">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {loanTerms.map(term => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                name="interestRate"
                placeholder="5.25"
                value={formData.interestRate}
                onChange={handleInputChange}
                suffix="%"
              />
            </div>
            
            <div>
              <Label htmlFor="estimatedClosingDate">Estimated Closing Date</Label>
              <Input
                id="estimatedClosingDate"
                name="estimatedClosingDate"
                type="date"
                value={formData.estimatedClosingDate}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-mortgage-darkPurple mb-3">Property Information</h3>
          
          <div className="mb-4 flex items-center space-x-2">
            <Checkbox 
              id="isNewPurchase" 
              checked={formData.isNewPurchase}
              onCheckedChange={(checked) => handleCheckboxChange("isNewPurchase", !!checked)}
            />
            <Label htmlFor="isNewPurchase">This is a new property purchase</Label>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="propertyAddress">Property Address</Label>
              <Input
                id="propertyAddress"
                name="propertyAddress"
                placeholder="Street address"
                value={formData.propertyAddress}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="propertyCity">City</Label>
                <Input
                  id="propertyCity"
                  name="propertyCity"
                  placeholder="City"
                  value={formData.propertyCity}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <Label htmlFor="propertyState">State</Label>
                <Input
                  id="propertyState"
                  name="propertyState"
                  placeholder="State"
                  value={formData.propertyState}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <Label htmlFor="propertyZip">ZIP Code</Label>
                <Input
                  id="propertyZip"
                  name="propertyZip"
                  placeholder="ZIP Code"
                  value={formData.propertyZip}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="propertyType">Property Type</Label>
                <Select 
                  value={formData.propertyType} 
                  onValueChange={(value) => handleSelectChange("propertyType", value)}
                >
                  <SelectTrigger id="propertyType">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="propertyUse">Property Use</Label>
                <Select 
                  value={formData.propertyUse} 
                  onValueChange={(value) => handleSelectChange("propertyUse", value)}
                >
                  <SelectTrigger id="propertyUse">
                    <SelectValue placeholder="Select property use" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyUses.map(use => (
                      <SelectItem key={use} value={use}>{use}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="propertyValue">Estimated Property Value</Label>
                <Input
                  id="propertyValue"
                  name="propertyValue"
                  placeholder="$ Amount"
                  value={formData.propertyValue}
                  onChange={handleInputChange}
                  prefix="$"
                />
              </div>
              
              <div>
                <Label htmlFor="downPayment">Down Payment</Label>
                <Input
                  id="downPayment"
                  name="downPayment"
                  placeholder="$ Amount"
                  value={formData.downPayment}
                  onChange={handleInputChange}
                  prefix="$"
                />
              </div>
            </div>
          </div>
        </div>

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
              'Save Loan Information'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientPortalLoanSummary;
