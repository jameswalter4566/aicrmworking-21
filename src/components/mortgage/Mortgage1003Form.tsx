
import React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LeadProfile as LeadProfileType } from "@/services/leadProfile";

interface Mortgage1003FormProps {
  lead: LeadProfileType;
  onSave: (section: string, data: Record<string, any>) => Promise<void>;
  isEditable?: boolean;
  isSaving?: boolean;
}

const Mortgage1003Form: React.FC<Mortgage1003FormProps> = ({
  lead,
  onSave,
  isEditable = true,
  isSaving = false
}) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = React.useState<string>("borrower");
  const [formData, setFormData] = React.useState<Record<string, any>>({
    // Borrower Information
    fullLegalName: lead.mortgageData?.borrower?.fullLegalName || "",
    dateOfBirth: lead.mortgageData?.borrower?.dateOfBirth || "",
    socialSecurityNumber: lead.mortgageData?.borrower?.socialSecurityNumber || "",
    maritalStatus: lead.mortgageData?.borrower?.maritalStatus || "",
    dependents: lead.mortgageData?.borrower?.dependents || "",
    citizenship: lead.mortgageData?.borrower?.citizenship || "",
    
    // Current Address
    currentAddress: lead.mortgageData?.currentAddress?.streetAddress || lead.propertyAddress || "",
    cityStateZip: lead.mortgageData?.currentAddress?.cityStateZip || "",
    durationAtAddress: lead.mortgageData?.currentAddress?.durationAtAddress || "",
    housingStatus: lead.mortgageData?.currentAddress?.housingStatus || "rent",
    monthlyHousingExpense: lead.mortgageData?.currentAddress?.monthlyHousingExpense || "",
    
    // Employment
    employerName: lead.mortgageData?.employment?.employerName || "",
    employerAddress: lead.mortgageData?.employment?.employerAddress || "",
    jobTitle: lead.mortgageData?.employment?.jobTitle || "",
    startDate: lead.mortgageData?.employment?.startDate || "",
    endDate: lead.mortgageData?.employment?.endDate || "",
    monthlyIncome: lead.mortgageData?.employment?.monthlyIncome || "",
    isSelfEmployed: lead.mortgageData?.employment?.isSelfEmployed || false,
    
    // Income and Assets
    baseIncome: lead.mortgageData?.income?.baseIncome || "",
    overtimeIncome: lead.mortgageData?.income?.overtimeIncome || "",
    otherIncome: lead.mortgageData?.income?.otherIncome || "",
    bankAccounts: lead.mortgageData?.assets?.bankAccounts || "",
    investments: lead.mortgageData?.assets?.investments || "",
    realEstateAssets: lead.mortgageData?.assets?.realEstateAssets || "",
    otherAssets: lead.mortgageData?.assets?.otherAssets || "",
    
    // Liabilities
    creditCards: lead.mortgageData?.liabilities?.creditCards || "",
    autoLoans: lead.mortgageData?.liabilities?.autoLoans || "",
    studentLoans: lead.mortgageData?.liabilities?.studentLoans || "",
    otherMortgages: lead.mortgageData?.liabilities?.otherMortgages || "",
    personalLoans: lead.mortgageData?.liabilities?.personalLoans || "",
    monthlyPayments: lead.mortgageData?.liabilities?.monthlyPayments || "",
    
    // Property Information
    subjectPropertyAddress: lead.mortgageData?.property?.subjectPropertyAddress || lead.propertyAddress || "",
    propertyValue: lead.mortgageData?.property?.propertyValue || "",
    loanAmount: lead.mortgageData?.property?.loanAmount || "",
    loanPurpose: lead.mortgageData?.property?.loanPurpose || "purchase",
    propertyType: lead.mortgageData?.property?.propertyType || "",
    occupancy: lead.mortgageData?.property?.occupancy || "primary",
    titleType: lead.mortgageData?.property?.titleType || "",
    
    // Declarations
    hasBankruptcies: lead.mortgageData?.declarations?.hasBankruptcies || false,
    hasAlimonyObligation: lead.mortgageData?.declarations?.hasAlimonyObligation || false,
    isCoSigner: lead.mortgageData?.declarations?.isCoSigner || false,
    intendToOccupy: lead.mortgageData?.declarations?.intendToOccupy || true,
    isCitizen: lead.mortgageData?.declarations?.isCitizen || true,
    
    // Demographic Information
    ethnicity: lead.mortgageData?.demographic?.ethnicity || "",
    race: lead.mortgageData?.demographic?.race || "",
    sex: lead.mortgageData?.demographic?.sex || "",
    collectionMethod: lead.mortgageData?.demographic?.collectionMethod || "applicant-provided",
    
    // Loan Information
    loanType: lead.mortgageData?.loan?.loanType || "conventional",
    mortgageTerm: lead.mortgageData?.loan?.mortgageTerm || "30",
    amortizationType: lead.mortgageData?.loan?.amortizationType || "fixed",
    interestRate: lead.mortgageData?.loan?.interestRate || "",
    mortgageInsurance: lead.mortgageData?.loan?.mortgageInsurance || ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSection = async () => {
    if (!isEditable || isSaving) return;
    
    try {
      const sectionMap: Record<string, string> = {
        borrower: "borrower",
        address: "currentAddress",
        employment: "employment",
        incomeAssets: "incomeAndAssets",
        liabilities: "liabilities",
        property: "property",
        declarations: "declarations",
        demographic: "demographic",
        loan: "loan"
      };

      const section = sectionMap[activeSection];
      const sectionData = getSectionData(activeSection);
      
      await onSave(section, sectionData);
      toast({
        title: "Information saved",
        description: `${getSectionTitle(activeSection)} information has been updated.`,
      });
    } catch (error) {
      console.error(`Error saving ${activeSection} information:`, error);
      toast({
        variant: "destructive",
        title: "Error saving information",
        description: "There was a problem saving your changes. Please try again."
      });
    }
  };

  const getSectionData = (section: string) => {
    switch (section) {
      case 'borrower':
        return {
          fullLegalName: formData.fullLegalName,
          dateOfBirth: formData.dateOfBirth,
          socialSecurityNumber: formData.socialSecurityNumber,
          maritalStatus: formData.maritalStatus,
          dependents: formData.dependents,
          citizenship: formData.citizenship
        };
      case 'address':
        return {
          streetAddress: formData.currentAddress,
          cityStateZip: formData.cityStateZip,
          durationAtAddress: formData.durationAtAddress,
          housingStatus: formData.housingStatus,
          monthlyHousingExpense: formData.monthlyHousingExpense
        };
      case 'employment':
        return {
          employerName: formData.employerName,
          employerAddress: formData.employerAddress,
          jobTitle: formData.jobTitle,
          startDate: formData.startDate,
          endDate: formData.endDate,
          monthlyIncome: formData.monthlyIncome,
          isSelfEmployed: formData.isSelfEmployed
        };
      case 'incomeAssets':
        return {
          income: {
            baseIncome: formData.baseIncome,
            overtimeIncome: formData.overtimeIncome,
            otherIncome: formData.otherIncome
          },
          assets: {
            bankAccounts: formData.bankAccounts,
            investments: formData.investments,
            realEstateAssets: formData.realEstateAssets,
            otherAssets: formData.otherAssets
          }
        };
      case 'liabilities':
        return {
          creditCards: formData.creditCards,
          autoLoans: formData.autoLoans,
          studentLoans: formData.studentLoans,
          otherMortgages: formData.otherMortgages,
          personalLoans: formData.personalLoans,
          monthlyPayments: formData.monthlyPayments
        };
      case 'property':
        return {
          subjectPropertyAddress: formData.subjectPropertyAddress,
          propertyValue: formData.propertyValue,
          loanAmount: formData.loanAmount,
          loanPurpose: formData.loanPurpose,
          propertyType: formData.propertyType,
          occupancy: formData.occupancy,
          titleType: formData.titleType
        };
      case 'declarations':
        return {
          hasBankruptcies: formData.hasBankruptcies,
          hasAlimonyObligation: formData.hasAlimonyObligation,
          isCoSigner: formData.isCoSigner,
          intendToOccupy: formData.intendToOccupy,
          isCitizen: formData.isCitizen
        };
      case 'demographic':
        return {
          ethnicity: formData.ethnicity,
          race: formData.race,
          sex: formData.sex,
          collectionMethod: formData.collectionMethod
        };
      case 'loan':
        return {
          loanType: formData.loanType,
          mortgageTerm: formData.mortgageTerm,
          amortizationType: formData.amortizationType,
          interestRate: formData.interestRate,
          mortgageInsurance: formData.mortgageInsurance
        };
      default:
        return {};
    }
  };

  const getSectionTitle = (section: string): string => {
    const titles: Record<string, string> = {
      borrower: "Borrower",
      address: "Current Address",
      employment: "Employment",
      incomeAssets: "Income & Assets",
      liabilities: "Liabilities",
      property: "Property",
      declarations: "Declarations",
      demographic: "Demographic",
      loan: "Loan"
    };
    
    return titles[section] || "Unknown Section";
  };

  return (
    <Card className="mt-6 border-2 border-blue-500">
      <Tabs 
        value={activeSection} 
        onValueChange={setActiveSection} 
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 w-full">
          <TabsTrigger value="borrower">Borrower</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="incomeAssets">Income & Assets</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="declarations">Declarations</TabsTrigger>
          <TabsTrigger value="demographic">Demographic</TabsTrigger>
          <TabsTrigger value="loan">Loan</TabsTrigger>
        </TabsList>

        {/* Borrower Information */}
        <TabsContent value="borrower">
          <CardContent className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-blue-600">Borrower Information</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullLegalName">Full Legal Name</Label>
                <Input
                  id="fullLegalName"
                  name="fullLegalName"
                  value={formData.fullLegalName}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  placeholder="First Middle Last Suffix"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                  />
                </div>
                
                <div>
                  <Label htmlFor="socialSecurityNumber">Social Security Number</Label>
                  <Input
                    id="socialSecurityNumber"
                    name="socialSecurityNumber"
                    value={formData.socialSecurityNumber}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    placeholder="XXX-XX-XXXX"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select
                    value={formData.maritalStatus}
                    onValueChange={(value) => handleSelectChange("maritalStatus", value)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger id="maritalStatus">
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="separated">Separated</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="dependents">Number of Dependents (and ages)</Label>
                  <Input
                    id="dependents"
                    name="dependents"
                    value={formData.dependents}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    placeholder="Example: 3 (5, 7, 10)"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="citizenship">Citizenship/Residency Status</Label>
                <Select
                  value={formData.citizenship}
                  onValueChange={(value) => handleSelectChange("citizenship", value)}
                  disabled={!isEditable}
                >
                  <SelectTrigger id="citizenship">
                    <SelectValue placeholder="Select citizenship status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usCitizen">US Citizen</SelectItem>
                    <SelectItem value="permanentResident">Permanent Resident</SelectItem>
                    <SelectItem value="nonPermanentResident">Non-Permanent Resident</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button onClick={handleSaveSection} disabled={!isEditable || isSaving}>
              {isSaving ? 'Saving...' : 'Save Borrower Information'}
            </Button>
          </CardContent>
        </TabsContent>

        {/* Current Address */}
        <TabsContent value="address">
          <CardContent className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-blue-600">Current Address</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentAddress">Street Address</Label>
                <Input
                  id="currentAddress"
                  name="currentAddress"
                  value={formData.currentAddress}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                />
              </div>
              
              <div>
                <Label htmlFor="cityStateZip">City, State, ZIP</Label>
                <Input
                  id="cityStateZip"
                  name="cityStateZip"
                  value={formData.cityStateZip}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  placeholder="Los Angeles, CA 90001"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="durationAtAddress">Duration at Address</Label>
                  <Input
                    id="durationAtAddress"
                    name="durationAtAddress"
                    value={formData.durationAtAddress}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    placeholder="Example: 5 years 2 months"
                  />
                </div>
                
                <div>
                  <Label htmlFor="housingStatus">Housing Status</Label>
                  <Select
                    value={formData.housingStatus}
                    onValueChange={(value) => handleSelectChange("housingStatus", value)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger id="housingStatus">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="own">Own</SelectItem>
                      <SelectItem value="living_rent_free">Living Rent Free</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="monthlyHousingExpense">Monthly Housing Expense ($)</Label>
                <Input
                  id="monthlyHousingExpense"
                  name="monthlyHousingExpense"
                  value={formData.monthlyHousingExpense}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <Button onClick={handleSaveSection} disabled={!isEditable || isSaving}>
              {isSaving ? 'Saving...' : 'Save Address Information'}
            </Button>
          </CardContent>
        </TabsContent>

        {/* Employment Information */}
        <TabsContent value="employment">
          <CardContent className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-blue-600">Employment Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isSelfEmployed"
                  checked={formData.isSelfEmployed}
                  onCheckedChange={(checked) => handleSwitchChange("isSelfEmployed", checked)}
                  disabled={!isEditable}
                />
                <Label htmlFor="isSelfEmployed">Self-employed</Label>
              </div>
              
              <div>
                <Label htmlFor="employerName">Employer Name</Label>
                <Input
                  id="employerName"
                  name="employerName"
                  value={formData.employerName}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                />
              </div>
              
              <div>
                <Label htmlFor="employerAddress">Employer Address and Phone</Label>
                <Textarea
                  id="employerAddress"
                  name="employerAddress"
                  value={formData.employerAddress}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="jobTitle">Job Title/Position</Label>
                <Input
                  id="jobTitle"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                  />
                </div>
                
                <div>
                  <Label htmlFor="endDate">End Date (if applicable)</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="monthlyIncome">Monthly Income ($)</Label>
                <Input
                  id="monthlyIncome"
                  name="monthlyIncome"
                  value={formData.monthlyIncome}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <Button onClick={handleSaveSection} disabled={!isEditable || isSaving}>
              {isSaving ? 'Saving...' : 'Save Employment Information'}
            </Button>
          </CardContent>
        </TabsContent>

        {/* Income and Assets */}
        <TabsContent value="incomeAssets">
          <CardContent className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-blue-600">Income and Assets</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium mb-3">Monthly Income</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="baseIncome">Base Income ($)</Label>
                    <Input
                      id="baseIncome"
                      name="baseIncome"
                      value={formData.baseIncome}
                      onChange={handleInputChange}
                      disabled={!isEditable}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="overtimeIncome">Overtime, Bonuses, Commissions ($)</Label>
                    <Input
                      id="overtimeIncome"
                      name="overtimeIncome"
                      value={formData.overtimeIncome}
                      onChange={handleInputChange}
                      disabled={!isEditable}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="otherIncome">Other Income ($)</Label>
                    <Input
                      id="otherIncome"
                      name="otherIncome"
                      value={formData.otherIncome}
                      onChange={handleInputChange}
                      disabled={!isEditable}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-md font-medium mb-3">Assets</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="bankAccounts">Bank Account Balances ($)</Label>
                    <Input
                      id="bankAccounts"
                      name="bankAccounts"
                      value={formData.bankAccounts}
                      onChange={handleInputChange}
                      disabled={!isEditable}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="investments">Investment Accounts ($)</Label>
                    <Input
                      id="investments"
                      name="investments"
                      value={formData.investments}
                      onChange={handleInputChange}
                      disabled={!isEditable}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="realEstateAssets">Real Estate Assets ($)</Label>
                    <Input
                      id="realEstateAssets"
                      name="realEstateAssets"
                      value={formData.realEstateAssets}
                      onChange={handleInputChange}
                      disabled={!isEditable}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="otherAssets">Other Assets ($)</Label>
                    <Input
                      id="otherAssets"
                      name="otherAssets"
                      value={formData.otherAssets}
                      onChange={handleInputChange}
                      disabled={!isEditable}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <Button onClick={handleSaveSection} disabled={!isEditable || isSaving}>
              {isSaving ? 'Saving...' : 'Save Income & Assets Information'}
            </Button>
          </CardContent>
        </TabsContent>

        {/* Liabilities */}
        <TabsContent value="liabilities">
          <CardContent className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-blue-600">Liabilities</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="creditCards">Credit Cards</Label>
                <Textarea
                  id="creditCards"
                  name="creditCards"
                  value={formData.creditCards}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  placeholder="Balance and payment details"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="autoLoans">Auto Loans</Label>
                <Textarea
                  id="autoLoans"
                  name="autoLoans"
                  value={formData.autoLoans}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  placeholder="Balance and payment details"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="studentLoans">Student Loans</Label>
                <Textarea
                  id="studentLoans"
                  name="studentLoans"
                  value={formData.studentLoans}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  placeholder="Balance and payment details"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="otherMortgages">Other Mortgages</Label>
                <Textarea
                  id="otherMortgages"
                  name="otherMortgages"
                  value={formData.otherMortgages}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  placeholder="Balance and payment details"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="personalLoans">Personal Loans</Label>
                <Textarea
                  id="personalLoans"
                  name="personalLoans"
                  value={formData.personalLoans}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  placeholder="Balance and payment details"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="monthlyPayments">Total Monthly Payments ($)</Label>
                <Input
                  id="monthlyPayments"
                  name="monthlyPayments"
                  value={formData.monthlyPayments}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <Button onClick={handleSaveSection} disabled={!isEditable || isSaving}>
              {isSaving ? 'Saving...' : 'Save Liabilities Information'}
            </Button>
          </CardContent>
        </TabsContent>

        {/* Property Information */}
        <TabsContent value="property">
          <CardContent className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-blue-600">Property Information</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="subjectPropertyAddress">Subject Property Address</Label>
                <Input
                  id="subjectPropertyAddress"
                  name="subjectPropertyAddress"
                  value={formData.subjectPropertyAddress}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyValue">Property Value ($)</Label>
                  <Input
                    id="propertyValue"
                    name="propertyValue"
                    value={formData.propertyValue}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="loanAmount">Loan Amount ($)</Label>
                  <Input
                    id="loanAmount"
                    name="loanAmount"
                    value={formData.loanAmount}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="loanPurpose">Loan Purpose</Label>
                  <Select
                    value={formData.loanPurpose}
                    onValueChange={(value) => handleSelectChange("loanPurpose", value)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger id="loanPurpose">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="refinance">Refinance</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="cashOut">Cash-Out Refinance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select
                    value={formData.propertyType}
                    onValueChange={(value) => handleSelectChange("propertyType", value)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger id="propertyType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="singleFamily">Single Family</SelectItem>
                      <SelectItem value="condo">Condominium</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="multifamily">Multifamily</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="occupancy">Intended Occupancy</Label>
                  <Select
                    value={formData.occupancy}
                    onValueChange={(value) => handleSelectChange("occupancy", value)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger id="occupancy">
                      <SelectValue placeholder="Select occupancy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary Residence</SelectItem>
                      <SelectItem value="secondary">Secondary Residence</SelectItem>
                      <SelectItem value="investment">Investment Property</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="titleType">How Property Will Be Titled</Label>
                  <Input
                    id="titleType"
                    name="titleType"
                    value={formData.titleType}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    placeholder="Individual, Joint, Trust, etc."
                  />
                </div>
              </div>
            </div>
            
            <Button onClick={handleSaveSection} disabled={!isEditable || isSaving}>
              {isSaving ? 'Saving...' : 'Save Property Information'}
            </Button>
          </CardContent>
        </TabsContent>

        {/* Declarations */}
        <TabsContent value="declarations">
          <CardContent className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-blue-600">Declarations</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasBankruptcies"
                  checked={formData.hasBankruptcies}
                  onCheckedChange={(checked) => handleSwitchChange("hasBankruptcies", checked)}
                  disabled={!isEditable}
                />
                <Label htmlFor="hasBankruptcies">Has bankruptcies, foreclosures, or lawsuits</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasAlimonyObligation"
                  checked={formData.hasAlimonyObligation}
                  onCheckedChange={(checked) => handleSwitchChange("hasAlimonyObligation", checked)}
                  disabled={!isEditable}
                />
                <Label htmlFor="hasAlimonyObligation">Obligated to pay alimony/child support</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isCoSigner"
                  checked={formData.isCoSigner}
                  onCheckedChange={(checked) => handleSwitchChange("isCoSigner", checked)}
                  disabled={!isEditable}
                />
                <Label htmlFor="isCoSigner">Co-signer on any loan</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="intendToOccupy"
                  checked={formData.intendToOccupy}
                  onCheckedChange={(checked) => handleSwitchChange("intendToOccupy", checked)}
                  disabled={!isEditable}
                />
                <Label htmlFor="intendToOccupy">Intends to occupy the property</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isCitizen"
                  checked={formData.isCitizen}
                  onCheckedChange={(checked) => handleSwitchChange("isCitizen", checked)}
                  disabled={!isEditable}
                />
                <Label htmlFor="isCitizen">U.S. Citizen or Permanent Resident</Label>
              </div>
            </div>
            
            <Button onClick={handleSaveSection} disabled={!isEditable || isSaving}>
              {isSaving ? 'Saving...' : 'Save Declarations'}
            </Button>
          </CardContent>
        </TabsContent>

        {/* Demographic Information */}
        <TabsContent value="demographic">
          <CardContent className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-blue-600">Demographic Information (HMDA)</h3>
            <p className="text-sm text-gray-500 mb-4">This information is collected for government reporting purposes under the Home Mortgage Disclosure Act. Providing this information is voluntary.</p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="ethnicity">Ethnicity</Label>
                <Select
                  value={formData.ethnicity}
                  onValueChange={(value) => handleSelectChange("ethnicity", value)}
                  disabled={!isEditable}
                >
                  <SelectTrigger id="ethnicity">
                    <SelectValue placeholder="Select ethnicity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hispanic">Hispanic or Latino</SelectItem>
                    <SelectItem value="not_hispanic">Not Hispanic or Latino</SelectItem>
                    <SelectItem value="not_provided">I do not wish to provide this information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="race">Race</Label>
                <Select
                  value={formData.race}
                  onValueChange={(value) => handleSelectChange("race", value)}
                  disabled={!isEditable}
                >
                  <SelectTrigger id="race">
                    <SelectValue placeholder="Select race" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="american_indian">American Indian or Alaska Native</SelectItem>
                    <SelectItem value="asian">Asian</SelectItem>
                    <SelectItem value="black">Black or African American</SelectItem>
                    <SelectItem value="pacific_islander">Native Hawaiian or Other Pacific Islander</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="not_provided">I do not wish to provide this information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="sex">Sex</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value) => handleSelectChange("sex", value)}
                  disabled={!isEditable}
                >
                  <SelectTrigger id="sex">
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="not_provided">I do not wish to provide this information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="collectionMethod">Information Collection Method</Label>
                <Select
                  value={formData.collectionMethod}
                  onValueChange={(value) => handleSelectChange("collectionMethod", value)}
                  disabled={!isEditable}
                >
                  <SelectTrigger id="collectionMethod">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applicant-provided">Applicant provided information</SelectItem>
                    <SelectItem value="visual">Based on visual observation</SelectItem>
                    <SelectItem value="surname">Based on surname</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button onClick={handleSaveSection} disabled={!isEditable || isSaving}>
              {isSaving ? 'Saving...' : 'Save Demographic Information'}
            </Button>
          </CardContent>
        </TabsContent>

        {/* Loan Information */}
        <TabsContent value="loan">
          <CardContent className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold text-blue-600">Loan and Product Information</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="loanType">Loan Type</Label>
                <Select
                  value={formData.loanType}
                  onValueChange={(value) => handleSelectChange("loanType", value)}
                  disabled={!isEditable}
                >
                  <SelectTrigger id="loanType">
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conventional">Conventional</SelectItem>
                    <SelectItem value="fha">FHA</SelectItem>
                    <SelectItem value="va">VA</SelectItem>
                    <SelectItem value="usda">USDA</SelectItem>
                    <SelectItem value="jumbo">Jumbo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mortgageTerm">Mortgage Term (years)</Label>
                  <Select
                    value={formData.mortgageTerm}
                    onValueChange={(value) => handleSelectChange("mortgageTerm", value)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger id="mortgageTerm">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 years</SelectItem>
                      <SelectItem value="20">20 years</SelectItem>
                      <SelectItem value="30">30 years</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="amortizationType">Amortization Type</Label>
                  <Select
                    value={formData.amortizationType}
                    onValueChange={(value) => handleSelectChange("amortizationType", value)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger id="amortizationType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Rate</SelectItem>
                      <SelectItem value="arm">Adjustable Rate (ARM)</SelectItem>
                      <SelectItem value="interest_only">Interest Only</SelectItem>
                      <SelectItem value="balloon">Balloon</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    name="interestRate"
                    value={formData.interestRate}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    placeholder="0.00%"
                  />
                </div>
                
                <div>
                  <Label htmlFor="mortgageInsurance">Mortgage Insurance</Label>
                  <Select
                    value={formData.mortgageInsurance}
                    onValueChange={(value) => handleSelectChange("mortgageInsurance", value)}
                    disabled={!isEditable}
                  >
                    <SelectTrigger id="mortgageInsurance">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="pmi">Private Mortgage Insurance (PMI)</SelectItem>
                      <SelectItem value="mip">Mortgage Insurance Premium (MIP)</SelectItem>
                      <SelectItem value="va_funding">VA Funding Fee</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Button onClick={handleSaveSection} disabled={!isEditable || isSaving}>
              {isSaving ? 'Saving...' : 'Save Loan Information'}
            </Button>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default Mortgage1003Form;
