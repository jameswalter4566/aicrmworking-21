
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, DollarSign, Percent, Building, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

interface LoanInformationFormProps {
  leadId: string;
  mortgageData?: any;
  onSave: (saveData: any) => Promise<void>;
  isEditable?: boolean;
}

export const LoanInformationForm = ({
  leadId,
  mortgageData = {},
  onSave,
  isEditable = true,
}: LoanInformationFormProps) => {
  const [activeTab, setActiveTab] = useState<string>("mortgage");
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize form data from mortgageData or with default values
  const [mortgageForm, setMortgageForm] = useState({
    mortgageType: mortgageData?.loan?.mortgageType || "Conventional",
    amortizationType: mortgageData?.loan?.amortizationType || "Fixed",
    loanFICO: mortgageData?.loan?.loanFICO || "",
    documentationType: mortgageData?.loan?.documentationType || "Full",
    interestRate: mortgageData?.loan?.interestRate || "",
    amortizedPayments: mortgageData?.loan?.amortizedPayments || "360",
    mortgagePurpose: mortgageData?.loan?.mortgagePurpose || "Refinance 1st Mortgage",
    refinancePurpose: mortgageData?.loan?.refinancePurpose || "Rate and Term - Conv",
    appraisedValue: mortgageData?.loan?.appraisedValue || "",
    baseLoanAmount: mortgageData?.loan?.baseLoanAmount || "",
    financedFees: mortgageData?.loan?.financedFees || "0.00",
    totalLoanAmount: mortgageData?.loan?.totalLoanAmount || "",
    secondLoanAmount: mortgageData?.loan?.secondLoanAmount || "0.00",
    ltv: mortgageData?.loan?.ltv || "",
    cltv: mortgageData?.loan?.cltv || "",
    tltv: mortgageData?.loan?.tltv || "",
    yearAcquired: mortgageData?.loan?.yearAcquired || "",
    existingLiens: mortgageData?.loan?.existingLiens || "0.00",
    originalCost: mortgageData?.loan?.originalCost || ""
  });
  
  const [propertyForm, setPropertyForm] = useState({
    propertyType: mortgageData?.property?.propertyType || "Single Family Residence",
    occupancy: mortgageData?.property?.occupancy || "Primary Residence",
    attachmentType: mortgageData?.property?.attachmentType || "Detached",
    addressLine1: mortgageData?.property?.addressLine1 || "",
    unit: mortgageData?.property?.unit || "",
    city: mortgageData?.property?.city || "",
    state: mortgageData?.property?.state || "California",
    zipCode: mortgageData?.property?.zipCode || "",
    county: mortgageData?.property?.county || "",
    numberOfUnits: mortgageData?.property?.numberOfUnits || "1",
    yearBuilt: mortgageData?.property?.yearBuilt || "",
    isNewConstruction: mortgageData?.property?.isNewConstruction || false,
    isLandContract: mortgageData?.property?.isLandContract || false,
    titleHolder: mortgageData?.property?.titleHolder || "",
    mannerHeld: mortgageData?.property?.mannerHeld || "Husband and Wife",
    propertyRights: mortgageData?.property?.propertyRights || "Fee Simple",
    mixedUseProperty: mortgageData?.property?.mixedUseProperty || "No"
  });

  const [rentalForm, setRentalForm] = useState({
    grossMonthlyRent: mortgageData?.rental?.grossMonthlyRent || "0.00",
    vacancyFactor: mortgageData?.rental?.vacancyFactor || "0.00",
    adjustedMonthlyGrossIncome: mortgageData?.rental?.adjustedMonthlyGrossIncome || "0.00",
    netRentalIncome: mortgageData?.rental?.netRentalIncome || "0.00"
  });

  // Handle mortgage form field changes
  const handleMortgageChange = (field: string, value: string) => {
    setMortgageForm(prev => {
      const updated = { ...prev, [field]: value };

      // Calculate LTV when either appraised value or loan amount changes
      if (field === 'appraisedValue' || field === 'baseLoanAmount') {
        const appraisedValue = parseFloat(field === 'appraisedValue' ? value : prev.appraisedValue) || 0;
        const baseLoanAmount = parseFloat(field === 'baseLoanAmount' ? value : prev.baseLoanAmount) || 0;
        
        if (appraisedValue > 0) {
          const ltv = (baseLoanAmount / appraisedValue * 100).toFixed(3);
          updated.ltv = ltv;
          updated.cltv = ltv; // Also update CLTV and TLTV with the same value for simplicity
          updated.tltv = ltv;
        }

        // Update total loan amount
        if (field === 'baseLoanAmount') {
          updated.totalLoanAmount = value;
        }
      }
      
      return updated;
    });
  };

  // Handle property form field changes
  const handlePropertyChange = (field: string, value: any) => {
    setPropertyForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle rental form field changes
  const handleRentalChange = (field: string, value: string) => {
    setRentalForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Calculate adjusted monthly gross income
      if (field === 'grossMonthlyRent' || field === 'vacancyFactor') {
        const grossRent = parseFloat(field === 'grossMonthlyRent' ? value : prev.grossMonthlyRent) || 0;
        const vacancyRate = parseFloat(field === 'vacancyFactor' ? value : prev.vacancyFactor) || 0;
        
        const adjustedIncome = grossRent * (1 - vacancyRate / 100);
        updated.adjustedMonthlyGrossIncome = adjustedIncome.toFixed(2);
        updated.netRentalIncome = adjustedIncome.toFixed(2); // Simplified calculation
      }
      
      return updated;
    });
  };

  // Handle form submission
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const loanData = {
        section: activeTab === "mortgage" ? "loan" : activeTab === "property" ? "property" : "rental",
        data: {
          loan: activeTab === "mortgage" ? mortgageForm : mortgageData?.loan || {},
          property: activeTab === "property" ? propertyForm : mortgageData?.property || {},
          rental: activeTab === "rental" ? rentalForm : mortgageData?.rental || {}
        }
      };
      
      await onSave(loanData);
    } catch (error) {
      console.error("Error saving loan information:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="bg-blue-600 text-white">
        <CardTitle className="text-xl flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          LOAN INFORMATION
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full border-b">
            <TabsTrigger value="mortgage" className="flex-1 uppercase font-semibold">
              Mortgage Purpose, Types & Terms
            </TabsTrigger>
            <TabsTrigger value="property" className="flex-1 uppercase font-semibold">
              Subject Property
            </TabsTrigger>
          </TabsList>
          
          {/* Mortgage Purpose, Types & Terms Tab */}
          <TabsContent value="mortgage" className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="mortgageType">Mortgage Applied For</Label>
                <Select
                  value={mortgageForm.mortgageType}
                  onValueChange={(value) => handleMortgageChange('mortgageType', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Conventional">Conventional</SelectItem>
                    <SelectItem value="FHA">FHA</SelectItem>
                    <SelectItem value="VA">VA</SelectItem>
                    <SelectItem value="USDA">USDA</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amortizationType">Amortization Type</Label>
                <Select
                  value={mortgageForm.amortizationType}
                  onValueChange={(value) => handleMortgageChange('amortizationType', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixed">Fixed</SelectItem>
                    <SelectItem value="ARM">Adjustable Rate (ARM)</SelectItem>
                    <SelectItem value="Balloon">Balloon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loanFICO">Loan FICO</Label>
                <Input
                  id="loanFICO"
                  value={mortgageForm.loanFICO}
                  onChange={(e) => handleMortgageChange('loanFICO', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="documentationType">Documentation Type</Label>
                <Select
                  value={mortgageForm.documentationType}
                  onValueChange={(value) => handleMortgageChange('documentationType', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full">Full</SelectItem>
                    <SelectItem value="Limited">Limited</SelectItem>
                    <SelectItem value="Stated Income">Stated Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate</Label>
                <div className="relative">
                  <Input
                    id="interestRate"
                    value={mortgageForm.interestRate}
                    onChange={(e) => handleMortgageChange('interestRate', e.target.value)}
                    disabled={!isEditable || isSaving}
                    className="pr-8"
                  />
                  <Percent className="h-4 w-4 absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amortizedPayments">Amortized No. Of Payments</Label>
                <Input
                  id="amortizedPayments"
                  value={mortgageForm.amortizedPayments}
                  onChange={(e) => handleMortgageChange('amortizedPayments', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mortgagePurpose">Mortgage Purpose</Label>
                <Select
                  value={mortgageForm.mortgagePurpose}
                  onValueChange={(value) => handleMortgageChange('mortgagePurpose', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Purchase">Purchase</SelectItem>
                    <SelectItem value="Refinance 1st Mortgage">Refinance 1st Mortgage</SelectItem>
                    <SelectItem value="Cash-Out Refinance">Cash-Out Refinance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="refinancePurpose">Refinance Purpose</Label>
                <Select
                  value={mortgageForm.refinancePurpose}
                  onValueChange={(value) => handleMortgageChange('refinancePurpose', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rate and Term - Conv">Rate and Term - Conv</SelectItem>
                    <SelectItem value="Cash-Out - Conv">Cash-Out - Conv</SelectItem>
                    <SelectItem value="Rate and Term - FHA">Rate and Term - FHA</SelectItem>
                    <SelectItem value="Cash-Out - FHA">Cash-Out - FHA</SelectItem>
                    <SelectItem value="IRRRL - VA">IRRRL - VA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="appraisedValue">Appraised Value</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <Input
                    id="appraisedValue"
                    value={mortgageForm.appraisedValue}
                    onChange={(e) => handleMortgageChange('appraisedValue', e.target.value)}
                    className="pl-8"
                    disabled={!isEditable || isSaving}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="baseLoanAmount">Base Loan Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <Input
                    id="baseLoanAmount"
                    value={mortgageForm.baseLoanAmount}
                    onChange={(e) => handleMortgageChange('baseLoanAmount', e.target.value)}
                    className="pl-8"
                    disabled={!isEditable || isSaving}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="financedFees">Financed Fees</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <Input
                    id="financedFees"
                    value={mortgageForm.financedFees}
                    onChange={(e) => handleMortgageChange('financedFees', e.target.value)}
                    className="pl-8"
                    disabled={!isEditable || isSaving}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="totalLoanAmount">Total Loan Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <Input
                    id="totalLoanAmount"
                    value={mortgageForm.totalLoanAmount}
                    onChange={(e) => handleMortgageChange('totalLoanAmount', e.target.value)}
                    className="pl-8"
                    disabled={!isEditable || isSaving}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondLoanAmount">Second Loan Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <Input
                    id="secondLoanAmount"
                    value={mortgageForm.secondLoanAmount}
                    onChange={(e) => handleMortgageChange('secondLoanAmount', e.target.value)}
                    className="pl-8"
                    disabled={!isEditable || isSaving}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ltv">LTV</Label>
                <div className="relative">
                  <Input
                    id="ltv"
                    value={mortgageForm.ltv}
                    onChange={(e) => handleMortgageChange('ltv', e.target.value)}
                    className="pr-8"
                    disabled={!isEditable || isSaving}
                  />
                  <Percent className="h-4 w-4 absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cltv">CLTV</Label>
                <div className="relative">
                  <Input
                    id="cltv"
                    value={mortgageForm.cltv}
                    onChange={(e) => handleMortgageChange('cltv', e.target.value)}
                    className="pr-8"
                    disabled={!isEditable || isSaving}
                  />
                  <Percent className="h-4 w-4 absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tltv">TLTV</Label>
                <div className="relative">
                  <Input
                    id="tltv"
                    value={mortgageForm.tltv}
                    onChange={(e) => handleMortgageChange('tltv', e.target.value)}
                    className="pr-8"
                    disabled={!isEditable || isSaving}
                  />
                  <Percent className="h-4 w-4 absolute right-3 top-3 text-gray-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="yearAcquired">Year Acquired</Label>
                <Input
                  id="yearAcquired"
                  value={mortgageForm.yearAcquired}
                  onChange={(e) => handleMortgageChange('yearAcquired', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="existingLiens">Amount Existing Liens</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <Input
                    id="existingLiens"
                    value={mortgageForm.existingLiens}
                    onChange={(e) => handleMortgageChange('existingLiens', e.target.value)}
                    className="pl-8"
                    disabled={!isEditable || isSaving}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="originalCost">Original Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <Input
                    id="originalCost"
                    value={mortgageForm.originalCost}
                    onChange={(e) => handleMortgageChange('originalCost', e.target.value)}
                    className="pl-8"
                    disabled={!isEditable || isSaving}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button
                onClick={handleSave}
                disabled={!isEditable || isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Loan Information
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          {/* Subject Property Tab */}
          <TabsContent value="property" className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type:</Label>
                <Select
                  value={propertyForm.propertyType}
                  onValueChange={(value) => handlePropertyChange('propertyType', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single Family Residence">Single Family Residence</SelectItem>
                    <SelectItem value="Condo">Condominium</SelectItem>
                    <SelectItem value="Townhouse">Townhouse</SelectItem>
                    <SelectItem value="2-4 Unit">2-4 Unit</SelectItem>
                    <SelectItem value="PUD">PUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="occupancy">Occupancy:</Label>
                <Select
                  value={propertyForm.occupancy}
                  onValueChange={(value) => handlePropertyChange('occupancy', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select occupancy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary Residence">Primary Residence</SelectItem>
                    <SelectItem value="Secondary Residence">Secondary Residence</SelectItem>
                    <SelectItem value="Investment Property">Investment Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attachmentType">Attachment Type:</Label>
                <Select
                  value={propertyForm.attachmentType}
                  onValueChange={(value) => handlePropertyChange('attachmentType', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Detached">Detached</SelectItem>
                    <SelectItem value="Attached">Attached</SelectItem>
                    <SelectItem value="Semi-Detached">Semi-Detached</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1:</Label>
                <Input
                  id="addressLine1"
                  value={propertyForm.addressLine1}
                  onChange={(e) => handlePropertyChange('addressLine1', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unit">Unit #:</Label>
                <Input
                  id="unit"
                  value={propertyForm.unit}
                  onChange={(e) => handlePropertyChange('unit', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">City:</Label>
                <Input
                  id="city"
                  value={propertyForm.city}
                  onChange={(e) => handlePropertyChange('city', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State:</Label>
                <Select
                  value={propertyForm.state}
                  onValueChange={(value) => handlePropertyChange('state', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="California">California</SelectItem>
                    <SelectItem value="Arizona">Arizona</SelectItem>
                    <SelectItem value="Nevada">Nevada</SelectItem>
                    <SelectItem value="Oregon">Oregon</SelectItem>
                    <SelectItem value="Washington">Washington</SelectItem>
                    {/* Add more states as needed */}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code:</Label>
                <Input
                  id="zipCode"
                  value={propertyForm.zipCode}
                  onChange={(e) => handlePropertyChange('zipCode', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="county">County:</Label>
                <Input
                  id="county"
                  value={propertyForm.county}
                  onChange={(e) => handlePropertyChange('county', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="numberOfUnits">Number Of Units:</Label>
                <Input
                  id="numberOfUnits"
                  value={propertyForm.numberOfUnits}
                  onChange={(e) => handlePropertyChange('numberOfUnits', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="yearBuilt">Year Built:</Label>
                <Input
                  id="yearBuilt"
                  value={propertyForm.yearBuilt}
                  onChange={(e) => handlePropertyChange('yearBuilt', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="flex items-center mt-8">
                <Checkbox
                  id="isNewConstruction"
                  checked={propertyForm.isNewConstruction}
                  onCheckedChange={(checked) => handlePropertyChange('isNewConstruction', !!checked)}
                  disabled={!isEditable || isSaving}
                />
                <Label htmlFor="isNewConstruction" className="ml-2">
                  New Construction
                </Label>
              </div>
              
              <div className="flex items-center mt-8">
                <Checkbox
                  id="isLandContract"
                  checked={propertyForm.isLandContract}
                  onCheckedChange={(checked) => handlePropertyChange('isLandContract', !!checked)}
                  disabled={!isEditable || isSaving}
                />
                <Label htmlFor="isLandContract" className="ml-2">
                  Land Contract Conversion
                </Label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="titleHolder">Title To Be Held In:</Label>
                <Input
                  id="titleHolder"
                  value={propertyForm.titleHolder}
                  onChange={(e) => handlePropertyChange('titleHolder', e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mannerHeld">Manner Held:</Label>
                <Select
                  value={propertyForm.mannerHeld}
                  onValueChange={(value) => handlePropertyChange('mannerHeld', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Husband and Wife">Husband and Wife</SelectItem>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Joint Tenants">Joint Tenants</SelectItem>
                    <SelectItem value="Tenancy in Common">Tenancy in Common</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="propertyRights">Property Rights:</Label>
                <Select
                  value={propertyForm.propertyRights}
                  onValueChange={(value) => handlePropertyChange('propertyRights', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rights" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fee Simple">Fee Simple</SelectItem>
                    <SelectItem value="Leasehold">Leasehold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6">
              <Label className="font-semibold block mb-2">Mixed Use Property:</Label>
              <p className="text-sm text-gray-600 mb-2">
                If you will occupy the property, will you set aside space within the property to operate your own business?
                <br />(e.g., daycare facility, medical office, beauty/barber shop)
              </p>
              
              <RadioGroup
                value={propertyForm.mixedUseProperty}
                onValueChange={(value) => handlePropertyChange('mixedUseProperty', value)}
                className="flex items-center space-x-6 mt-2"
                disabled={!isEditable || isSaving}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="mixed-use-yes" />
                  <Label htmlFor="mixed-use-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="mixed-use-no" />
                  <Label htmlFor="mixed-use-no">No</Label>
                </div>
              </RadioGroup>
            </div>
            
            <Separator className="my-6" />
            
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-base font-semibold text-blue-800 uppercase mb-4">RENTAL INCOME CALCULATOR</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="grossMonthlyRent">Gross Monthly Rent</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <Input
                      id="grossMonthlyRent"
                      value={rentalForm.grossMonthlyRent}
                      onChange={(e) => handleRentalChange('grossMonthlyRent', e.target.value)}
                      className="pl-8"
                      disabled={!isEditable || isSaving}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vacancyFactor">Vacancy Factor</Label>
                  <div className="relative">
                    <Input
                      id="vacancyFactor"
                      value={rentalForm.vacancyFactor}
                      onChange={(e) => handleRentalChange('vacancyFactor', e.target.value)}
                      className="pr-8"
                      disabled={!isEditable || isSaving}
                    />
                    <Percent className="h-4 w-4 absolute right-3 top-3 text-gray-400" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adjustedMonthlyGrossIncome">Adjusted Monthly Gross Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <Input
                      id="adjustedMonthlyGrossIncome"
                      value={rentalForm.adjustedMonthlyGrossIncome}
                      readOnly
                      className="pl-8 bg-gray-100"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="netRentalIncome">Net Rental Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                    <Input
                      id="netRentalIncome"
                      value={rentalForm.netRentalIncome}
                      readOnly
                      className="pl-8 bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <Button
                onClick={handleSave}
                disabled={!isEditable || isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Property Information
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
