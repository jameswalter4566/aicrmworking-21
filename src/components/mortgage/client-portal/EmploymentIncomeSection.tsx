
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type EmploymentType = "employed" | "self_employed" | "unemployed" | "retired" | "";

const initialFields = {
  employmentType: "" as EmploymentType,
  employerName: "",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressZip: "",
  industry: "",
  phone: "",
  position: "",
  startMonth: "",
  startYear: "",
  isRelated: false,
  incomeBase: "",
  incomeOvertime: "",
  incomeBonus: "",
  incomeCommission: "",
  incomeOther: "",
};

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function EmploymentIncomeSection() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [leadId, setLeadId] = useState<string | null>(null);
  const [fields, setFields] = useState(initialFields);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slug || !token) return;
    
    const fetchEmploymentData = async () => {
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
        const employment = mortgageData.employment || {};
        
        // Map data from existing employment info if available
        setFields({
          employmentType: employment.employmentType || "",
          employerName: employment.employerName || "",
          addressStreet: employment.addressStreet || "",
          addressCity: employment.addressCity || "",
          addressState: employment.addressState || "",
          addressZip: employment.addressZip || "",
          industry: employment.industry || "",
          phone: employment.phone || "",
          position: employment.position || "",
          startMonth: employment.startMonth || "",
          startYear: employment.startYear || "",
          isRelated: employment.isRelated || false,
          incomeBase: employment.incomeBase || "",
          incomeOvertime: employment.incomeOvertime || "",
          incomeBonus: employment.incomeBonus || "",
          incomeCommission: employment.incomeCommission || "",
          incomeOther: employment.incomeOther || "",
        });
      } catch (error) {
        console.error("Error in fetchEmploymentData:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmploymentData();
  }, [slug, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields({ ...fields, [name]: value });
  };
  
  const handleSelect = (name: string, value: string) => {
    setFields({ ...fields, [name]: value });
  };

  const handleCheckbox = (checked: boolean) => {
    setFields({ ...fields, isRelated: checked });
  };
  
  const handleSubmit = async () => {
    if (!leadId) {
      toast.error("Cannot save: Lead ID is missing");
      return;
    }
    
    try {
      setSaving(true);
      
      // Prepare employment data for saving
      const employmentData = {
        ...fields
      };
      
      const mortgageData = {
        employment: employmentData
      };
      
      const { data, error } = await supabase.functions.invoke('update-lead', {
        body: { 
          leadId: leadId,
          leadData: { mortgageData }
        }
      });
      
      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Failed to update employment information");
      }
      
      toast.success("Employment information saved successfully");
    } catch (error) {
      console.error("Error saving employment information:", error);
      toast.error("Failed to save employment information");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-4">
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Employment & Income</CardTitle>
        <CardDescription>
          Please provide your current employment and income details below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label>Employment Type</Label>
          <Select
            value={fields.employmentType}
            onValueChange={val => handleSelect("employmentType", val)}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select employment status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employed">Employed</SelectItem>
              <SelectItem value="self_employed">Self-employed</SelectItem>
              <SelectItem value="unemployed">Unemployed</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="employerName">Name of Employer</Label>
              <Input
                id="employerName"
                name="employerName"
                value={fields.employerName}
                onChange={handleChange}
                placeholder={fields.employmentType === "self_employed" ? "Name of Business" : "Employer Name"}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                name="industry"
                value={fields.industry}
                onChange={handleChange}
                placeholder="Industry"
              />
            </div>
          </div>
          <div>
            <Label>Employer Address</Label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-1">
              <Input 
                placeholder="Street Address" 
                value={fields.addressStreet} 
                name="addressStreet" 
                onChange={handleChange} 
              />
              <Input 
                placeholder="City" 
                value={fields.addressCity} 
                name="addressCity" 
                onChange={handleChange} 
              />
              <Input 
                placeholder="State" 
                value={fields.addressState} 
                name="addressState" 
                onChange={handleChange} 
              />
              <Input 
                placeholder="Zipcode" 
                value={fields.addressZip} 
                name="addressZip" 
                onChange={handleChange} 
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="phone">Phone of Employer</Label>
              <Input
                id="phone"
                name="phone"
                value={fields.phone}
                onChange={handleChange}
                placeholder="Phone Number"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="position">Position/Title</Label>
              <Input
                id="position"
                name="position"
                value={fields.position}
                onChange={handleChange}
                placeholder="Position/Title"
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="startMonth">Start Month</Label>
              <Select
                value={fields.startMonth}
                onValueChange={val => handleSelect("startMonth", val)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="startYear">Start Year</Label>
              <Input
                id="startYear"
                name="startYear"
                type="number"
                min="1900"
                value={fields.startYear}
                onChange={handleChange}
                placeholder="Year"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="related"
              checked={fields.isRelated}
              onCheckedChange={checked => handleCheckbox(!!checked)}
            />
            <Label htmlFor="related">
              I am employed by a family member, property seller, real estate agent, or other party to the transaction.
            </Label>
          </div>
          <div className="space-y-2 mt-6">
            <h4 className="font-semibold text-gray-800 mb-2">Gross Monthly Income</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                name="incomeBase"
                value={fields.incomeBase}
                onChange={handleChange}
                placeholder="Base"
                type="number"
                min="0"
                prefix="$"
              />
              <Input
                name="incomeOvertime"
                value={fields.incomeOvertime}
                onChange={handleChange}
                placeholder="Overtime"
                type="number"
                min="0"
                prefix="$"
              />
              <Input
                name="incomeBonus"
                value={fields.incomeBonus}
                onChange={handleChange}
                placeholder="Bonus"
                type="number"
                min="0"
                prefix="$"
              />
              <Input
                name="incomeCommission"
                value={fields.incomeCommission}
                onChange={handleChange}
                placeholder="Commission"
                type="number"
                min="0"
                prefix="$"
              />
              <Input
                name="incomeOther"
                value={fields.incomeOther}
                onChange={handleChange}
                placeholder="Other"
                type="number"
                min="0"
                prefix="$"
              />
            </div>
            <div className="font-medium mt-2">
              Total: ${[
                fields.incomeBase,
                fields.incomeOvertime,
                fields.incomeBonus,
                fields.incomeCommission,
                fields.incomeOther
              ].map(Number).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} per month
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button 
              className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Employment Information'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
