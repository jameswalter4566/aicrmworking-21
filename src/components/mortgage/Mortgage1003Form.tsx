
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadProfile } from "@/services/leadProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, Briefcase, Home, CreditCard, User, FileText, 
  Building, BarChart, Percent, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

interface Mortgage1003FormProps {
  lead: LeadProfile;
  onSave: (section: string, data: Record<string, any>) => Promise<void>;
  isEditable: boolean;
  isSaving: boolean;
}

const Mortgage1003Form: React.FC<Mortgage1003FormProps> = ({ 
  lead, 
  onSave, 
  isEditable = true,
  isSaving = false 
}) => {
  // Get mortgage data from lead or initialize empty object
  const mortgageData = lead.mortgageData || {};
  
  // Initialize form state for each section
  const [borrowerForm, setBorrowerForm] = useState({
    fullLegalName: mortgageData.borrower?.fullLegalName || '',
    dateOfBirth: mortgageData.borrower?.dateOfBirth || '',
    socialSecurityNumber: mortgageData.borrower?.socialSecurityNumber || '',
    maritalStatus: mortgageData.borrower?.maritalStatus || '',
    dependents: mortgageData.borrower?.dependents || '',
    citizenship: mortgageData.borrower?.citizenship || ''
  });

  const [addressForm, setAddressForm] = useState({
    streetAddress: mortgageData.currentAddress?.streetAddress || '',
    cityStateZip: mortgageData.currentAddress?.cityStateZip || '',
    durationAtAddress: mortgageData.currentAddress?.durationAtAddress || '',
    housingStatus: mortgageData.currentAddress?.housingStatus || '',
    monthlyHousingExpense: mortgageData.currentAddress?.monthlyHousingExpense || ''
  });

  const [employmentForm, setEmploymentForm] = useState({
    employerName: mortgageData.employment?.employerName || '',
    employerAddress: mortgageData.employment?.employerAddress || '',
    jobTitle: mortgageData.employment?.jobTitle || '',
    startDate: mortgageData.employment?.startDate || '',
    endDate: mortgageData.employment?.endDate || '',
    monthlyIncome: mortgageData.employment?.monthlyIncome || '',
    isSelfEmployed: mortgageData.employment?.isSelfEmployed || false
  });

  const [incomeForm, setIncomeForm] = useState({
    baseIncome: mortgageData.income?.baseIncome || '',
    overtimeIncome: mortgageData.income?.overtimeIncome || '',
    otherIncome: mortgageData.income?.otherIncome || ''
  });

  const [assetsForm, setAssetsForm] = useState({
    bankAccounts: mortgageData.assets?.bankAccounts || '',
    investments: mortgageData.assets?.investments || '',
    realEstateAssets: mortgageData.assets?.realEstateAssets || '',
    otherAssets: mortgageData.assets?.otherAssets || ''
  });

  const [liabilitiesForm, setLiabilitiesForm] = useState({
    creditCards: mortgageData.liabilities?.creditCards || '',
    autoLoans: mortgageData.liabilities?.autoLoans || '',
    studentLoans: mortgageData.liabilities?.studentLoans || '',
    otherMortgages: mortgageData.liabilities?.otherMortgages || '',
    personalLoans: mortgageData.liabilities?.personalLoans || '',
    monthlyPayments: mortgageData.liabilities?.monthlyPayments || ''
  });

  const [propertyForm, setPropertyForm] = useState({
    subjectPropertyAddress: mortgageData.property?.subjectPropertyAddress || '',
    propertyValue: mortgageData.property?.propertyValue || '',
    loanAmount: mortgageData.property?.loanAmount || '',
    loanPurpose: mortgageData.property?.loanPurpose || '',
    propertyType: mortgageData.property?.propertyType || '',
    occupancy: mortgageData.property?.occupancy || '',
    titleType: mortgageData.property?.titleType || ''
  });

  const [declarationsForm, setDeclarationsForm] = useState({
    hasBankruptcies: mortgageData.declarations?.hasBankruptcies || false,
    hasAlimonyObligation: mortgageData.declarations?.hasAlimonyObligation || false,
    isCoSigner: mortgageData.declarations?.isCoSigner || false,
    intendToOccupy: mortgageData.declarations?.intendToOccupy || true,
    isCitizen: mortgageData.declarations?.isCitizen || true
  });

  const [demographicForm, setDemographicForm] = useState({
    ethnicity: mortgageData.demographic?.ethnicity || '',
    race: mortgageData.demographic?.race || '',
    sex: mortgageData.demographic?.sex || '',
    collectionMethod: mortgageData.demographic?.collectionMethod || 'Applicant Provided'
  });

  const [loanForm, setLoanForm] = useState({
    loanType: mortgageData.loan?.loanType || '',
    mortgageTerm: mortgageData.loan?.mortgageTerm || '',
    amortizationType: mortgageData.loan?.amortizationType || '',
    interestRate: mortgageData.loan?.interestRate || '',
    mortgageInsurance: mortgageData.loan?.mortgageInsurance || ''
  });

  const handleSaveSection = async (section: string, data: Record<string, any>) => {
    if (!isEditable) return;
    
    try {
      await onSave(section, data);
    } catch (error) {
      console.error(`Error saving ${section} data:`, error);
      toast.error(`Failed to save ${section} information`);
    }
  };

  return (
    <Card className="border-blue-500 border-2">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-500" />
          Mortgage Application (Form 1003)
        </CardTitle>
        <CardDescription>
          FNMA Standard Loan Application Information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="borrower" className="w-full">
          <TabsList className="flex flex-wrap mb-4">
            <TabsTrigger value="borrower" className="mr-1 mb-1">
              <User className="h-4 w-4 mr-1" /> Borrower
            </TabsTrigger>
            <TabsTrigger value="address" className="mr-1 mb-1">
              <Home className="h-4 w-4 mr-1" /> Address
            </TabsTrigger>
            <TabsTrigger value="employment" className="mr-1 mb-1">
              <Briefcase className="h-4 w-4 mr-1" /> Employment
            </TabsTrigger>
            <TabsTrigger value="income" className="mr-1 mb-1">
              <BarChart className="h-4 w-4 mr-1" /> Income
            </TabsTrigger>
            <TabsTrigger value="assets" className="mr-1 mb-1">
              <Building className="h-4 w-4 mr-1" /> Assets
            </TabsTrigger>
            <TabsTrigger value="liabilities" className="mr-1 mb-1">
              <CreditCard className="h-4 w-4 mr-1" /> Liabilities
            </TabsTrigger>
            <TabsTrigger value="property" className="mr-1 mb-1">
              <Home className="h-4 w-4 mr-1" /> Property
            </TabsTrigger>
            <TabsTrigger value="declarations" className="mr-1 mb-1">
              <ClipboardCheck className="h-4 w-4 mr-1" /> Declarations
            </TabsTrigger>
            <TabsTrigger value="demographic" className="mr-1 mb-1">
              <User className="h-4 w-4 mr-1" /> Demographic
            </TabsTrigger>
            <TabsTrigger value="loan" className="mr-1 mb-1">
              <Percent className="h-4 w-4 mr-1" /> Loan
            </TabsTrigger>
          </TabsList>

          {/* Borrower Information Section */}
          <TabsContent value="borrower" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullLegalName">Full Legal Name</Label>
                <Input 
                  id="fullLegalName"
                  placeholder="First Middle Last Suffix"
                  value={borrowerForm.fullLegalName}
                  onChange={(e) => setBorrowerForm({...borrowerForm, fullLegalName: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input 
                  id="dateOfBirth"
                  type="date"
                  value={borrowerForm.dateOfBirth}
                  onChange={(e) => setBorrowerForm({...borrowerForm, dateOfBirth: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="socialSecurityNumber">Social Security Number</Label>
                <Input 
                  id="socialSecurityNumber"
                  placeholder="XXX-XX-XXXX"
                  value={borrowerForm.socialSecurityNumber}
                  onChange={(e) => setBorrowerForm({...borrowerForm, socialSecurityNumber: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <Select 
                  value={borrowerForm.maritalStatus}
                  onValueChange={(value) => setBorrowerForm({...borrowerForm, maritalStatus: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="maritalStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="separated">Separated</SelectItem>
                    <SelectItem value="unmarried">Unmarried</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dependents">Dependents (number and ages)</Label>
                <Input 
                  id="dependents"
                  placeholder="e.g., 2 (10, 12)"
                  value={borrowerForm.dependents}
                  onChange={(e) => setBorrowerForm({...borrowerForm, dependents: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="citizenship">Citizenship Status</Label>
                <Select 
                  value={borrowerForm.citizenship} 
                  onValueChange={(value) => setBorrowerForm({...borrowerForm, citizenship: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="citizenship">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usaCitizen">U.S. Citizen</SelectItem>
                    <SelectItem value="permanentResident">Permanent Resident</SelectItem>
                    <SelectItem value="nonPermanentResident">Non-Permanent Resident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => handleSaveSection('borrower', borrowerForm)}
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
                    Save Borrower Information
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Address Section */}
          <TabsContent value="address" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input 
                  id="streetAddress"
                  placeholder="123 Main St"
                  value={addressForm.streetAddress}
                  onChange={(e) => setAddressForm({...addressForm, streetAddress: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cityStateZip">City, State, ZIP</Label>
                <Input 
                  id="cityStateZip"
                  placeholder="Anytown, CA 12345"
                  value={addressForm.cityStateZip}
                  onChange={(e) => setAddressForm({...addressForm, cityStateZip: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationAtAddress">Years at Address</Label>
                <Input 
                  id="durationAtAddress"
                  placeholder="e.g., 5 years"
                  value={addressForm.durationAtAddress}
                  onChange={(e) => setAddressForm({...addressForm, durationAtAddress: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="housingStatus">Housing Status</Label>
                <Select 
                  value={addressForm.housingStatus} 
                  onValueChange={(value) => setAddressForm({...addressForm, housingStatus: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="housingStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Own</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="liveWithFamily">Live with Family</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyHousingExpense">Monthly Housing Expense</Label>
                <Input 
                  id="monthlyHousingExpense"
                  placeholder="$1,500"
                  value={addressForm.monthlyHousingExpense}
                  onChange={(e) => setAddressForm({...addressForm, monthlyHousingExpense: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => handleSaveSection('currentAddress', addressForm)}
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
                    Save Address Information
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Employment Section */}
          <TabsContent value="employment" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employerName">Employer Name</Label>
                <Input 
                  id="employerName"
                  placeholder="ABC Company"
                  value={employmentForm.employerName}
                  onChange={(e) => setEmploymentForm({...employmentForm, employerName: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employerAddress">Employer Address</Label>
                <Input 
                  id="employerAddress"
                  placeholder="123 Business Ave, City, ST 12345"
                  value={employmentForm.employerAddress}
                  onChange={(e) => setEmploymentForm({...employmentForm, employerAddress: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title/Position</Label>
                <Input 
                  id="jobTitle"
                  placeholder="Senior Manager"
                  value={employmentForm.jobTitle}
                  onChange={(e) => setEmploymentForm({...employmentForm, jobTitle: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input 
                  id="startDate"
                  type="date"
                  value={employmentForm.startDate}
                  onChange={(e) => setEmploymentForm({...employmentForm, startDate: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (if applicable)</Label>
                <Input 
                  id="endDate"
                  type="date"
                  value={employmentForm.endDate}
                  onChange={(e) => setEmploymentForm({...employmentForm, endDate: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyIncome">Monthly Income</Label>
                <Input 
                  id="monthlyIncome"
                  placeholder="$5,000"
                  value={employmentForm.monthlyIncome}
                  onChange={(e) => setEmploymentForm({...employmentForm, monthlyIncome: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isSelfEmployed"
                    checked={employmentForm.isSelfEmployed}
                    onCheckedChange={(checked) => setEmploymentForm({...employmentForm, isSelfEmployed: checked})}
                    disabled={!isEditable || isSaving}
                  />
                  <Label htmlFor="isSelfEmployed">Self-Employed</Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => handleSaveSection('employment', employmentForm)}
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
                    Save Employment Information
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Income Section */}
          <TabsContent value="income" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseIncome">Base Income (monthly)</Label>
                <Input 
                  id="baseIncome"
                  placeholder="$5,000"
                  value={incomeForm.baseIncome}
                  onChange={(e) => setIncomeForm({...incomeForm, baseIncome: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overtimeIncome">Overtime Income (monthly)</Label>
                <Input 
                  id="overtimeIncome"
                  placeholder="$500"
                  value={incomeForm.overtimeIncome}
                  onChange={(e) => setIncomeForm({...incomeForm, overtimeIncome: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherIncome">Other Income (monthly)</Label>
                <Input 
                  id="otherIncome"
                  placeholder="$1,000"
                  value={incomeForm.otherIncome}
                  onChange={(e) => setIncomeForm({...incomeForm, otherIncome: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => handleSaveSection('income', incomeForm)}
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
                    Save Income Information
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Assets Section */}
          <TabsContent value="assets" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccounts">Bank Accounts (total)</Label>
                <Input 
                  id="bankAccounts"
                  placeholder="$25,000"
                  value={assetsForm.bankAccounts}
                  onChange={(e) => setAssetsForm({...assetsForm, bankAccounts: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investments">Investments (total)</Label>
                <Input 
                  id="investments"
                  placeholder="$50,000"
                  value={assetsForm.investments}
                  onChange={(e) => setAssetsForm({...assetsForm, investments: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="realEstateAssets">Real Estate Assets (total)</Label>
                <Input 
                  id="realEstateAssets"
                  placeholder="$250,000"
                  value={assetsForm.realEstateAssets}
                  onChange={(e) => setAssetsForm({...assetsForm, realEstateAssets: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherAssets">Other Assets (total)</Label>
                <Input 
                  id="otherAssets"
                  placeholder="$15,000"
                  value={assetsForm.otherAssets}
                  onChange={(e) => setAssetsForm({...assetsForm, otherAssets: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => handleSaveSection('assets', assetsForm)}
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
                    Save Assets Information
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Liabilities Section */}
          <TabsContent value="liabilities" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creditCards">Credit Cards (total)</Label>
                <Input 
                  id="creditCards"
                  placeholder="$5,000"
                  value={liabilitiesForm.creditCards}
                  onChange={(e) => setLiabilitiesForm({...liabilitiesForm, creditCards: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="autoLoans">Auto Loans (total)</Label>
                <Input 
                  id="autoLoans"
                  placeholder="$15,000"
                  value={liabilitiesForm.autoLoans}
                  onChange={(e) => setLiabilitiesForm({...liabilitiesForm, autoLoans: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentLoans">Student Loans (total)</Label>
                <Input 
                  id="studentLoans"
                  placeholder="$25,000"
                  value={liabilitiesForm.studentLoans}
                  onChange={(e) => setLiabilitiesForm({...liabilitiesForm, studentLoans: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="otherMortgages">Other Mortgages (total)</Label>
                <Input 
                  id="otherMortgages"
                  placeholder="$200,000"
                  value={liabilitiesForm.otherMortgages}
                  onChange={(e) => setLiabilitiesForm({...liabilitiesForm, otherMortgages: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personalLoans">Personal Loans (total)</Label>
                <Input 
                  id="personalLoans"
                  placeholder="$10,000"
                  value={liabilitiesForm.personalLoans}
                  onChange={(e) => setLiabilitiesForm({...liabilitiesForm, personalLoans: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyPayments">Monthly Payments (total)</Label>
                <Input 
                  id="monthlyPayments"
                  placeholder="$1,200"
                  value={liabilitiesForm.monthlyPayments}
                  onChange={(e) => setLiabilitiesForm({...liabilitiesForm, monthlyPayments: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => handleSaveSection('liabilities', liabilitiesForm)}
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
                    Save Liabilities Information
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Property Section */}
          <TabsContent value="property" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subjectPropertyAddress">Subject Property Address</Label>
                <Input 
                  id="subjectPropertyAddress"
                  placeholder="123 Property St, City, ST 12345"
                  value={propertyForm.subjectPropertyAddress}
                  onChange={(e) => setPropertyForm({...propertyForm, subjectPropertyAddress: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="propertyValue">Estimated Property Value</Label>
                <Input 
                  id="propertyValue"
                  placeholder="$350,000"
                  value={propertyForm.propertyValue}
                  onChange={(e) => setPropertyForm({...propertyForm, propertyValue: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loanAmount">Requested Loan Amount</Label>
                <Input 
                  id="loanAmount"
                  placeholder="$280,000"
                  value={propertyForm.loanAmount}
                  onChange={(e) => setPropertyForm({...propertyForm, loanAmount: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loanPurpose">Loan Purpose</Label>
                <Select 
                  value={propertyForm.loanPurpose} 
                  onValueChange={(value) => setPropertyForm({...propertyForm, loanPurpose: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="loanPurpose">
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="refinance">Refinance</SelectItem>
                    <SelectItem value="cashOutRefinance">Cash-Out Refinance</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type</Label>
                <Select 
                  value={propertyForm.propertyType} 
                  onValueChange={(value) => setPropertyForm({...propertyForm, propertyType: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="propertyType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="singleFamily">Single Family</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="multiFamily">Multi-Family (2-4 units)</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupancy">Intended Occupancy</Label>
                <Select 
                  value={propertyForm.occupancy} 
                  onValueChange={(value) => setPropertyForm({...propertyForm, occupancy: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="occupancy">
                    <SelectValue placeholder="Select occupancy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primaryResidence">Primary Residence</SelectItem>
                    <SelectItem value="secondaryHome">Secondary Home</SelectItem>
                    <SelectItem value="investment">Investment Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titleType">Title will be held as</Label>
                <Select 
                  value={propertyForm.titleType} 
                  onValueChange={(value) => setPropertyForm({...propertyForm, titleType: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="titleType">
                    <SelectValue placeholder="Select title type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soleOwnership">Sole Ownership</SelectItem>
                    <SelectItem value="jointTenancy">Joint Tenancy</SelectItem>
                    <SelectItem value="tenancyInCommon">Tenancy In Common</SelectItem>
                    <SelectItem value="trust">Trust</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => handleSaveSection('property', propertyForm)}
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

          {/* Declarations Section */}
          <TabsContent value="declarations" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasBankruptcies">Have you had any bankruptcies, foreclosures, or judgments?</Label>
                <Switch
                  id="hasBankruptcies"
                  checked={declarationsForm.hasBankruptcies}
                  onCheckedChange={(checked) => setDeclarationsForm({...declarationsForm, hasBankruptcies: checked})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="hasAlimonyObligation">Are you obligated to pay alimony or child support?</Label>
                <Switch
                  id="hasAlimonyObligation"
                  checked={declarationsForm.hasAlimonyObligation}
                  onCheckedChange={(checked) => setDeclarationsForm({...declarationsForm, hasAlimonyObligation: checked})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="isCoSigner">Are you a co-signer on any other loans?</Label>
                <Switch
                  id="isCoSigner"
                  checked={declarationsForm.isCoSigner}
                  onCheckedChange={(checked) => setDeclarationsForm({...declarationsForm, isCoSigner: checked})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="intendToOccupy">Do you intend to occupy the property as your primary residence?</Label>
                <Switch
                  id="intendToOccupy"
                  checked={declarationsForm.intendToOccupy}
                  onCheckedChange={(value) => setDeclarationsForm({...declarationsForm, intendToOccupy: value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="isCitizen">Are you a U.S. citizen or permanent resident alien?</Label>
                <Switch
                  id="isCitizen"
                  checked={declarationsForm.isCitizen}
                  onCheckedChange={(value) => setDeclarationsForm({...declarationsForm, isCitizen: value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => handleSaveSection('declarations', declarationsForm)}
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
                    Save Declaration Information
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Demographic Section */}
          <TabsContent value="demographic" className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
              This demographic information is collected for government monitoring purposes under the Home Mortgage Disclosure Act (HMDA). Providing this information is voluntary.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ethnicity">Ethnicity</Label>
                <Select 
                  value={demographicForm.ethnicity} 
                  onValueChange={(value) => setDemographicForm({...demographicForm, ethnicity: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="ethnicity">
                    <SelectValue placeholder="Select ethnicity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hispanicOrLatino">Hispanic or Latino</SelectItem>
                    <SelectItem value="notHispanicOrLatino">Not Hispanic or Latino</SelectItem>
                    <SelectItem value="doNotWishToProvide">I do not wish to provide this information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="race">Race</Label>
                <Select 
                  value={demographicForm.race} 
                  onValueChange={(value) => setDemographicForm({...demographicForm, race: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="race">
                    <SelectValue placeholder="Select race" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="americanIndianOrAlaskaNative">American Indian or Alaska Native</SelectItem>
                    <SelectItem value="asian">Asian</SelectItem>
                    <SelectItem value="blackOrAfricanAmerican">Black or African American</SelectItem>
                    <SelectItem value="nativeHawaiianOrOtherPacificIslander">Native Hawaiian or Other Pacific Islander</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="doNotWishToProvide">I do not wish to provide this information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sex">Sex</Label>
                <Select 
                  value={demographicForm.sex} 
                  onValueChange={(value) => setDemographicForm({...demographicForm, sex: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="sex">
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="doNotWishToProvide">I do not wish to provide this information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="collectionMethod">Method of Collection</Label>
                <Select 
                  value={demographicForm.collectionMethod} 
                  onValueChange={(value) => setDemographicForm({...demographicForm, collectionMethod: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="collectionMethod">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Applicant Provided">Applicant Provided</SelectItem>
                    <SelectItem value="Visual Observation">Visual Observation</SelectItem>
                    <SelectItem value="Surname">Surname</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => handleSaveSection('demographic', demographicForm)}
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
                    Save Demographic Information
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Loan Section */}
          <TabsContent value="loan" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loanType">Loan Type</Label>
                <Select 
                  value={loanForm.loanType} 
                  onValueChange={(value) => setLoanForm({...loanForm, loanType: value})}
                  disabled={!isEditable || isSaving}
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
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mortgageTerm">Mortgage Term</Label>
                <Select 
                  value={loanForm.mortgageTerm} 
                  onValueChange={(value) => setLoanForm({...loanForm, mortgageTerm: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="mortgageTerm">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Year</SelectItem>
                    <SelectItem value="20">20 Year</SelectItem>
                    <SelectItem value="15">15 Year</SelectItem>
                    <SelectItem value="10">10 Year</SelectItem>
                    <SelectItem value="5">5 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amortizationType">Amortization Type</Label>
                <Select 
                  value={loanForm.amortizationType} 
                  onValueChange={(value) => setLoanForm({...loanForm, amortizationType: value})}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger id="amortizationType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Rate</SelectItem>
                    <SelectItem value="arm3">3/1 ARM</SelectItem>
                    <SelectItem value="arm5">5/1 ARM</SelectItem>
                    <SelectItem value="arm7">7/1 ARM</SelectItem>
                    <SelectItem value="arm10">10/1 ARM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate</Label>
                <Input 
                  id="interestRate"
                  placeholder="3.25%"
                  value={loanForm.interestRate}
                  onChange={(e) => setLoanForm({...loanForm, interestRate: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mortgageInsurance">Mortgage Insurance</Label>
                <Input 
                  id="mortgageInsurance"
                  placeholder="0.55%"
                  value={loanForm.mortgageInsurance}
                  onChange={(e) => setLoanForm({...loanForm, mortgageInsurance: e.target.value})}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => handleSaveSection('loan', loanForm)}
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
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Mortgage1003Form;
