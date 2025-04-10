
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadProfile } from "@/services/leadProfile";

interface Mortgage1003FormProps {
  lead: LeadProfile;
  onSave: (section: string, data: Record<string, any>) => Promise<void>;
  isEditable: boolean;
  isSaving: boolean;
}

const Mortgage1003Form: React.FC<Mortgage1003FormProps> = ({ lead, onSave, isEditable, isSaving }) => {
  const [pushingToPipeline, setPushingToPipeline] = useState(false);
  const [activeSection, setActiveSection] = useState("borrower");
  const mortgageData = lead.mortgageData || {};
  
  const handlePushToPipeline = () => {
    setPushingToPipeline(true);
    // Implement pipeline push logic here
    setTimeout(() => {
      setPushingToPipeline(false);
    }, 1500);
  };

  // Utility function to handle form section saves
  const handleSectionSave = (section: string, data: Record<string, any>) => {
    if (onSave) {
      return onSave(section, data);
    }
    return Promise.resolve();
  };

  // Borrower Section State
  const [borrowerData, setBorrowerData] = useState(mortgageData.borrower || {});
  const handleBorrowerChange = (field: string, value: string) => {
    setBorrowerData(prev => ({ ...prev, [field]: value }));
  };
  const saveBorrowerData = () => {
    return handleSectionSave('borrower', borrowerData);
  };

  // Address Section State
  const [addressData, setAddressData] = useState(mortgageData.currentAddress || {});
  const handleAddressChange = (field: string, value: string) => {
    setAddressData(prev => ({ ...prev, [field]: value }));
  };
  const saveAddressData = () => {
    return handleSectionSave('currentAddress', addressData);
  };

  // Employment Section State
  const [employmentData, setEmploymentData] = useState(mortgageData.employment || {});
  const handleEmploymentChange = (field: string, value: string | boolean) => {
    setEmploymentData(prev => ({ ...prev, [field]: value }));
  };
  const saveEmploymentData = () => {
    return handleSectionSave('employment', employmentData);
  };

  // Income Section State
  const [incomeData, setIncomeData] = useState(mortgageData.income || {});
  const handleIncomeChange = (field: string, value: string) => {
    setIncomeData(prev => ({ ...prev, [field]: value }));
  };
  const saveIncomeData = () => {
    return handleSectionSave('income', incomeData);
  };

  // Assets Section State
  const [assetsData, setAssetsData] = useState(mortgageData.assets || {});
  const handleAssetsChange = (field: string, value: string) => {
    setAssetsData(prev => ({ ...prev, [field]: value }));
  };
  const saveAssetsData = () => {
    return handleSectionSave('assets', assetsData);
  };

  // Liabilities Section State
  const [liabilitiesData, setLiabilitiesData] = useState(mortgageData.liabilities || {});
  const handleLiabilitiesChange = (field: string, value: string) => {
    setLiabilitiesData(prev => ({ ...prev, [field]: value }));
  };
  const saveLiabilitiesData = () => {
    return handleSectionSave('liabilities', liabilitiesData);
  };

  // Property Section State
  const [propertyData, setPropertyData] = useState(mortgageData.property || {});
  const handlePropertyChange = (field: string, value: string) => {
    setPropertyData(prev => ({ ...prev, [field]: value }));
  };
  const savePropertyData = () => {
    return handleSectionSave('property', propertyData);
  };

  // Declarations Section State
  const [declarationsData, setDeclarationsData] = useState(mortgageData.declarations || {});
  const handleDeclarationsChange = (field: string, value: boolean) => {
    setDeclarationsData(prev => ({ ...prev, [field]: value }));
  };
  const saveDeclarationsData = () => {
    return handleSectionSave('declarations', declarationsData);
  };

  // Demographic Section State
  const [demographicData, setDemographicData] = useState(mortgageData.demographic || {});
  const handleDemographicChange = (field: string, value: string) => {
    setDemographicData(prev => ({ ...prev, [field]: value }));
  };
  const saveDemographicData = () => {
    return handleSectionSave('demographic', demographicData);
  };

  // Loan Section State
  const [loanData, setLoanData] = useState(mortgageData.loan || {});
  const handleLoanChange = (field: string, value: string) => {
    setLoanData(prev => ({ ...prev, [field]: value }));
  };
  const saveLoanData = () => {
    return handleSectionSave('loan', loanData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Mortgage Application</CardTitle>
            <CardDescription>URLA / Freddie Mac Form 65 / Fannie Mae Form 1003</CardDescription>
          </div>
          <Button 
            type="button" 
            variant="dialer" 
            className="
              bg-blue-600 
              text-white 
              hover:bg-blue-700 
              transition-all 
              duration-300 
              shadow-lg 
              shadow-blue-500/50 
              hover:shadow-blue-500/70 
              animate-pulse-glow 
              border 
              border-blue-500 
              hover:border-blue-600
            " 
            onClick={handlePushToPipeline} 
            disabled={pushingToPipeline}
          >
            {pushingToPipeline ? "Pushing to Pipeline..." : "Push to Pipeline"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-11 mb-6">
            <TabsTrigger value="borrower">Borrower</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="declarations">Declarations</TabsTrigger>
            <TabsTrigger value="demographic">Demographic</TabsTrigger>
            <TabsTrigger value="loan">Loan</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
          </TabsList>

          {/* Borrower Section */}
          <TabsContent value="borrower" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Full Legal Name</label>
                <Input
                  value={borrowerData.fullLegalName || ""}
                  onChange={(e) => handleBorrowerChange("fullLegalName", e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Date of Birth</label>
                <Input
                  type="date"
                  value={borrowerData.dateOfBirth || ""}
                  onChange={(e) => handleBorrowerChange("dateOfBirth", e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Social Security Number</label>
                <Input
                  type="password"
                  value={borrowerData.socialSecurityNumber || ""}
                  onChange={(e) => handleBorrowerChange("socialSecurityNumber", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="XXX-XX-XXXX"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Marital Status</label>
                <Select
                  value={borrowerData.maritalStatus || ""}
                  onValueChange={(value) => handleBorrowerChange("maritalStatus", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Dependents</label>
                <Input
                  value={borrowerData.dependents || ""}
                  onChange={(e) => handleBorrowerChange("dependents", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="Number of dependents"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Citizenship</label>
                <Select
                  value={borrowerData.citizenship || ""}
                  onValueChange={(value) => handleBorrowerChange("citizenship", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select citizenship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-citizen">U.S. Citizen</SelectItem>
                    <SelectItem value="permanent-resident">Permanent Resident</SelectItem>
                    <SelectItem value="non-permanent-resident">Non-Permanent Resident</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                onClick={saveBorrowerData}
                disabled={isSaving || !isEditable}
              >
                {isSaving ? "Saving..." : "Save Borrower Information"}
              </Button>
            </CardFooter>
          </TabsContent>

          {/* Address Section */}
          <TabsContent value="address" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Street Address</label>
                <Textarea
                  value={addressData.streetAddress || ""}
                  onChange={(e) => handleAddressChange("streetAddress", e.target.value)}
                  disabled={!isEditable || isSaving}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">City, State, ZIP</label>
                <Input
                  value={addressData.cityStateZip || ""}
                  onChange={(e) => handleAddressChange("cityStateZip", e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Duration at Address</label>
                <Input
                  value={addressData.durationAtAddress || ""}
                  onChange={(e) => handleAddressChange("durationAtAddress", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="Years and months"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Housing Status</label>
                <Select
                  value={addressData.housingStatus || ""}
                  onValueChange={(value) => handleAddressChange("housingStatus", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select housing status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Own</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="living-with-family">Living with Family</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Monthly Housing Expense</label>
                <Input
                  value={addressData.monthlyHousingExpense || ""}
                  onChange={(e) => handleAddressChange("monthlyHousingExpense", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                onClick={saveAddressData}
                disabled={isSaving || !isEditable}
              >
                {isSaving ? "Saving..." : "Save Address Information"}
              </Button>
            </CardFooter>
          </TabsContent>

          {/* Employment Section */}
          <TabsContent value="employment" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Employer Name</label>
                <Input
                  value={employmentData.employerName || ""}
                  onChange={(e) => handleEmploymentChange("employerName", e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div className="flex items-center space-x-2 mt-7">
                <Checkbox
                  id="isSelfEmployed"
                  checked={!!employmentData.isSelfEmployed}
                  onCheckedChange={(checked) => handleEmploymentChange("isSelfEmployed", checked === true)}
                  disabled={!isEditable || isSaving}
                />
                <label
                  htmlFor="isSelfEmployed"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Self-employed
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Employer Address</label>
              <Textarea
                value={employmentData.employerAddress || ""}
                onChange={(e) => handleEmploymentChange("employerAddress", e.target.value)}
                disabled={!isEditable || isSaving}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Job Title</label>
                <Input
                  value={employmentData.jobTitle || ""}
                  onChange={(e) => handleEmploymentChange("jobTitle", e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={employmentData.startDate || ""}
                  onChange={(e) => handleEmploymentChange("startDate", e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">End Date (if applicable)</label>
                <Input
                  type="date"
                  value={employmentData.endDate || ""}
                  onChange={(e) => handleEmploymentChange("endDate", e.target.value)}
                  disabled={!isEditable || isSaving}
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Monthly Income</label>
              <Input
                value={employmentData.monthlyIncome || ""}
                onChange={(e) => handleEmploymentChange("monthlyIncome", e.target.value)}
                disabled={!isEditable || isSaving}
                placeholder="$"
              />
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                onClick={saveEmploymentData}
                disabled={isSaving || !isEditable}
              >
                {isSaving ? "Saving..." : "Save Employment Information"}
              </Button>
            </CardFooter>
          </TabsContent>

          {/* Income Section */}
          <TabsContent value="income" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Base Income (Monthly)</label>
                <Input
                  value={incomeData.baseIncome || ""}
                  onChange={(e) => handleIncomeChange("baseIncome", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Overtime (Monthly)</label>
                <Input
                  value={incomeData.overtimeIncome || ""}
                  onChange={(e) => handleIncomeChange("overtimeIncome", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Other Income (Monthly)</label>
              <Input
                value={incomeData.otherIncome || ""}
                onChange={(e) => handleIncomeChange("otherIncome", e.target.value)}
                disabled={!isEditable || isSaving}
                placeholder="$"
              />
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                onClick={saveIncomeData}
                disabled={isSaving || !isEditable}
              >
                {isSaving ? "Saving..." : "Save Income Information"}
              </Button>
            </CardFooter>
          </TabsContent>

          {/* Assets Section */}
          <TabsContent value="assets" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Bank Accounts (Total)</label>
                <Input
                  value={assetsData.bankAccounts || ""}
                  onChange={(e) => handleAssetsChange("bankAccounts", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Investments (Total)</label>
                <Input
                  value={assetsData.investments || ""}
                  onChange={(e) => handleAssetsChange("investments", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Real Estate Assets (Total Value)</label>
                <Input
                  value={assetsData.realEstateAssets || ""}
                  onChange={(e) => handleAssetsChange("realEstateAssets", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Other Assets (Total)</label>
                <Input
                  value={assetsData.otherAssets || ""}
                  onChange={(e) => handleAssetsChange("otherAssets", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                onClick={saveAssetsData}
                disabled={isSaving || !isEditable}
              >
                {isSaving ? "Saving..." : "Save Assets Information"}
              </Button>
            </CardFooter>
          </TabsContent>

          {/* Liabilities Section */}
          <TabsContent value="liabilities" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Credit Cards (Total Balance)</label>
                <Input
                  value={liabilitiesData.creditCards || ""}
                  onChange={(e) => handleLiabilitiesChange("creditCards", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Auto Loans (Total Balance)</label>
                <Input
                  value={liabilitiesData.autoLoans || ""}
                  onChange={(e) => handleLiabilitiesChange("autoLoans", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Student Loans (Total Balance)</label>
                <Input
                  value={liabilitiesData.studentLoans || ""}
                  onChange={(e) => handleLiabilitiesChange("studentLoans", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Other Mortgages (Total Balance)</label>
                <Input
                  value={liabilitiesData.otherMortgages || ""}
                  onChange={(e) => handleLiabilitiesChange("otherMortgages", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Personal Loans (Total Balance)</label>
                <Input
                  value={liabilitiesData.personalLoans || ""}
                  onChange={(e) => handleLiabilitiesChange("personalLoans", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Total Monthly Payments</label>
                <Input
                  value={liabilitiesData.monthlyPayments || ""}
                  onChange={(e) => handleLiabilitiesChange("monthlyPayments", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                onClick={saveLiabilitiesData}
                disabled={isSaving || !isEditable}
              >
                {isSaving ? "Saving..." : "Save Liabilities Information"}
              </Button>
            </CardFooter>
          </TabsContent>

          {/* Property Section */}
          <TabsContent value="property" className="space-y-6">
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Subject Property Address</label>
              <Textarea
                value={propertyData.subjectPropertyAddress || ""}
                onChange={(e) => handlePropertyChange("subjectPropertyAddress", e.target.value)}
                disabled={!isEditable || isSaving}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Property Value</label>
                <Input
                  value={propertyData.propertyValue || ""}
                  onChange={(e) => handlePropertyChange("propertyValue", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Loan Amount</label>
                <Input
                  value={propertyData.loanAmount || ""}
                  onChange={(e) => handlePropertyChange("loanAmount", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Loan Purpose</label>
                <Select
                  value={propertyData.loanPurpose || ""}
                  onValueChange={(value) => handlePropertyChange("loanPurpose", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="refinance">Refinance</SelectItem>
                    <SelectItem value="cashout-refinance">Cash-Out Refinance</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Property Type</label>
                <Select
                  value={propertyData.propertyType || ""}
                  onValueChange={(value) => handlePropertyChange("propertyType", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single-family">Single Family</SelectItem>
                    <SelectItem value="multi-family">Multi-Family (2-4 units)</SelectItem>
                    <SelectItem value="condo">Condominium</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="manufactured">Manufactured Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Occupancy</label>
                <Select
                  value={propertyData.occupancy || ""}
                  onValueChange={(value) => handlePropertyChange("occupancy", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select occupancy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary Residence</SelectItem>
                    <SelectItem value="secondary">Secondary Residence</SelectItem>
                    <SelectItem value="investment">Investment Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                onClick={savePropertyData}
                disabled={isSaving || !isEditable}
              >
                {isSaving ? "Saving..." : "Save Property Information"}
              </Button>
            </CardFooter>
          </TabsContent>

          {/* Declarations Section */}
          <TabsContent value="declarations" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasBankruptcies"
                  checked={!!declarationsData.hasBankruptcies}
                  onCheckedChange={(checked) => handleDeclarationsChange("hasBankruptcies", checked === true)}
                  disabled={!isEditable || isSaving}
                />
                <label
                  htmlFor="hasBankruptcies"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Have you had a bankruptcy in the last 7 years?
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasAlimonyObligation"
                  checked={!!declarationsData.hasAlimonyObligation}
                  onCheckedChange={(checked) => handleDeclarationsChange("hasAlimonyObligation", checked === true)}
                  disabled={!isEditable || isSaving}
                />
                <label
                  htmlFor="hasAlimonyObligation"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Are you obligated to pay alimony, child support, or separate maintenance?
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCoSigner"
                  checked={!!declarationsData.isCoSigner}
                  onCheckedChange={(checked) => handleDeclarationsChange("isCoSigner", checked === true)}
                  disabled={!isEditable || isSaving}
                />
                <label
                  htmlFor="isCoSigner"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Are you a co-signer or guarantor on any debt or loan?
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="intendToOccupy"
                  checked={!!declarationsData.intendToOccupy}
                  onCheckedChange={(checked) => handleDeclarationsChange("intendToOccupy", checked === true)}
                  disabled={!isEditable || isSaving}
                />
                <label
                  htmlFor="intendToOccupy"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Do you intend to occupy the property as your primary residence?
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCitizen"
                  checked={!!declarationsData.isCitizen}
                  onCheckedChange={(checked) => handleDeclarationsChange("isCitizen", checked === true)}
                  disabled={!isEditable || isSaving}
                />
                <label
                  htmlFor="isCitizen"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Are you a U.S. citizen?
                </label>
              </div>
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                onClick={saveDeclarationsData}
                disabled={isSaving || !isEditable}
              >
                {isSaving ? "Saving..." : "Save Declarations"}
              </Button>
            </CardFooter>
          </TabsContent>

          {/* Demographic Section */}
          <TabsContent value="demographic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Ethnicity</label>
                <Select
                  value={demographicData.ethnicity || ""}
                  onValueChange={(value) => handleDemographicChange("ethnicity", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ethnicity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hispanic-or-latino">Hispanic or Latino</SelectItem>
                    <SelectItem value="not-hispanic-or-latino">Not Hispanic or Latino</SelectItem>
                    <SelectItem value="not-provided">I do not wish to provide this information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Race</label>
                <Select
                  value={demographicData.race || ""}
                  onValueChange={(value) => handleDemographicChange("race", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select race" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="american-indian">American Indian or Alaska Native</SelectItem>
                    <SelectItem value="asian">Asian</SelectItem>
                    <SelectItem value="black">Black or African American</SelectItem>
                    <SelectItem value="pacific-islander">Native Hawaiian or Other Pacific Islander</SelectItem>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="not-provided">I do not wish to provide this information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Sex</label>
                <Select
                  value={demographicData.sex || ""}
                  onValueChange={(value) => handleDemographicChange("sex", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="not-provided">I do not wish to provide this information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Information Collection Method</label>
                <Select
                  value={demographicData.collectionMethod || ""}
                  onValueChange={(value) => handleDemographicChange("collectionMethod", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="face-to-face">Face-to-Face Interview</SelectItem>
                    <SelectItem value="telephone">Telephone Interview</SelectItem>
                    <SelectItem value="email">Email or Internet</SelectItem>
                    <SelectItem value="mail">Mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                onClick={saveDemographicData}
                disabled={isSaving || !isEditable}
              >
                {isSaving ? "Saving..." : "Save Demographic Information"}
              </Button>
            </CardFooter>
          </TabsContent>

          {/* Loan Section */}
          <TabsContent value="loan" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Loan Type</label>
                <Select
                  value={loanData.loanType || ""}
                  onValueChange={(value) => handleLoanChange("loanType", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conventional">Conventional</SelectItem>
                    <SelectItem value="fha">FHA</SelectItem>
                    <SelectItem value="va">VA</SelectItem>
                    <SelectItem value="usda">USDA / Rural Housing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Mortgage Term</label>
                <Select
                  value={loanData.mortgageTerm || ""}
                  onValueChange={(value) => handleLoanChange("mortgageTerm", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Years</SelectItem>
                    <SelectItem value="20">20 Years</SelectItem>
                    <SelectItem value="15">15 Years</SelectItem>
                    <SelectItem value="10">10 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Amortization Type</label>
                <Select
                  value={loanData.amortizationType || ""}
                  onValueChange={(value) => handleLoanChange("amortizationType", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select amortization type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Rate</SelectItem>
                    <SelectItem value="arm">Adjustable Rate (ARM)</SelectItem>
                    <SelectItem value="balloon">Balloon</SelectItem>
                    <SelectItem value="interest-only">Interest Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Interest Rate</label>
                <Input
                  value={loanData.interestRate || ""}
                  onChange={(e) => handleLoanChange("interestRate", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="%"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Mortgage Insurance</label>
                <Input
                  value={loanData.mortgageInsurance || ""}
                  onChange={(e) => handleLoanChange("mortgageInsurance", e.target.value)}
                  disabled={!isEditable || isSaving}
                  placeholder="$ or %"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Loan Status</label>
                <Select
                  value={loanData.status || ""}
                  onValueChange={(value) => handleLoanChange("status", value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-qualification">Pre-Qualification</SelectItem>
                    <SelectItem value="pre-approval">Pre-Approval</SelectItem>
                    <SelectItem value="application">Application</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="underwriting">Underwriting</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="funded">Funded</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                onClick={saveLoanData}
                disabled={isSaving || !isEditable}
              >
                {isSaving ? "Saving..." : "Save Loan Information"}
              </Button>
            </CardFooter>
          </TabsContent>

          {/* Review Section */}
          <TabsContent value="review" className="space-y-6">
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Application Summary</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Borrower Name</p>
                  <p className="font-medium">{borrowerData.fullLegalName || "Not provided"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Property Address</p>
                  <p className="font-medium">{propertyData.subjectPropertyAddress || "Not provided"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Loan Amount</p>
                  <p className="font-medium">{propertyData.loanAmount || "Not provided"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Loan Type</p>
                  <p className="font-medium">{loanData.loanType || "Not provided"}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{loanData.status || "Not provided"}</p>
                </div>
              </div>
            </div>
            <CardFooter className="px-0 pb-0">
              <Button
                type="button"
                variant="dialer" 
                onClick={handlePushToPipeline}
                disabled={isSaving || pushingToPipeline}
                className="bg-crm-blue hover:bg-crm-blue/90 
                  transition-all duration-300 
                  shadow-lg shadow-blue-500/50 
                  hover:shadow-blue-500/70 
                  animate-pulse-glow"
              >
                {pushingToPipeline ? "Pushing to Pipeline..." : "Push to Pipeline"}
              </Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Mortgage1003Form;
