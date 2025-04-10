import React, { useState } from "react";
import { LeadProfile } from "@/services/leadProfile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface Mortgage1003FormProps {
  lead: LeadProfile | null;
  onSave: (section: string, data: Record<string, any>) => void;
  isEditable: boolean;
  isSaving: boolean;
}

const Mortgage1003Form: React.FC<Mortgage1003FormProps> = ({ 
  lead, 
  onSave, 
  isEditable,
  isSaving
}) => {
  const initialBorrowerForm = lead?.mortgageData?.borrower || {
    fullLegalName: '',
    dateOfBirth: '',
    socialSecurityNumber: '',
    maritalStatus: '',
    dependents: '',
    citizenship: ''
  };
  const [borrowerForm, setBorrowerForm] = useState(initialBorrowerForm);

  const initialCurrentAddressForm = lead?.mortgageData?.currentAddress || {
    streetAddress: '',
    cityStateZip: '',
    durationAtAddress: '',
    housingStatus: '',
    monthlyHousingExpense: ''
  };
  const [currentAddressForm, setCurrentAddressForm] = useState(initialCurrentAddressForm);

  const initialEmploymentForm = lead?.mortgageData?.employment || {
    employerName: '',
    employerAddress: '',
    jobTitle: '',
    startDate: '',
    endDate: '',
    monthlyIncome: '',
    isSelfEmployed: false
  };
  const [employmentForm, setEmploymentForm] = useState(initialEmploymentForm);

  const initialIncomeForm = lead?.mortgageData?.income || {
    baseIncome: '',
    overtimeIncome: '',
    otherIncome: ''
  };
  const [incomeForm, setIncomeForm] = useState(initialIncomeForm);

  const initialAssetsForm = lead?.mortgageData?.assets || {
    bankAccounts: '',
    investments: '',
    realEstateAssets: '',
    otherAssets: ''
  };
  const [assetsForm, setAssetsForm] = useState(initialAssetsForm);

  const initialLiabilitiesForm = lead?.mortgageData?.liabilities || {
    creditCards: '',
    autoLoans: '',
    studentLoans: '',
    otherMortgages: '',
    personalLoans: '',
    monthlyPayments: ''
  };
  const [liabilitiesForm, setLiabilitiesForm] = useState(initialLiabilitiesForm);

  const initialPropertyForm = lead?.mortgageData?.property || {
    subjectPropertyAddress: '',
    propertyValue: '',
    loanAmount: '',
    loanPurpose: '',
    propertyType: '',
    occupancy: '',
    titleType: ''
  };
  const [propertyForm, setPropertyForm] = useState(initialPropertyForm);

  const initialDeclarationsForm = lead?.mortgageData?.declarations || {
    hasBankruptcies: false,
    hasAlimonyObligation: false,
    isCoSigner: false,
    intendToOccupy: false,
    isCitizen: false
  };
  const [declarationsForm, setDeclarationsForm] = useState(initialDeclarationsForm);

  const initialDemographicForm = lead?.mortgageData?.demographic || {
    ethnicity: '',
    race: '',
    sex: '',
    collectionMethod: ''
  };
  const [demographicForm, setDemographicForm] = useState(initialDemographicForm);

   const initialLoanForm = lead?.mortgageData?.loan || {
    loanType: '',
    mortgageTerm: '',
    amortizationType: '',
    interestRate: '',
    mortgageInsurance: ''
  };
  const [loanForm, setLoanForm] = useState(initialLoanForm);

  const handleBorrowerSave = () => {
    onSave('borrower', borrowerForm);
  };

  const handleCurrentAddressSave = () => {
    onSave('currentAddress', currentAddressForm);
  };

  const handleEmploymentSave = () => {
    onSave('employment', employmentForm);
  };

  const handleIncomeSave = () => {
    onSave('income', incomeForm);
  };

  const handleAssetsSave = () => {
    onSave('assets', assetsForm);
  };

  const handleLiabilitiesSave = () => {
    onSave('liabilities', liabilitiesForm);
  };

  const handlePropertySave = () => {
    onSave('property', propertyForm);
  };

  const handleDeclarationsSave = () => {
    onSave('declarations', declarationsForm);
  };

  const handleDemographicSave = () => {
    onSave('demographic', demographicForm);
  };

  const handleLoanSave = () => {
    onSave('loan', loanForm);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Borrower Information</CardTitle>
          <CardDescription>Enter the borrower's personal details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullLegalName">Full Legal Name</Label>
              <Input
                id="fullLegalName"
                value={borrowerForm.fullLegalName || ''}
                onChange={(e) => setBorrowerForm({...borrowerForm, fullLegalName: e.target.value})}
                disabled={!isEditable || isSaving}
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                type="date"
                id="dateOfBirth"
                value={borrowerForm.dateOfBirth || ''}
                onChange={(e) => setBorrowerForm({...borrowerForm, dateOfBirth: e.target.value})}
                disabled={!isEditable || isSaving}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="socialSecurityNumber">Social Security Number</Label>
              <Input
                id="socialSecurityNumber"
                value={borrowerForm.socialSecurityNumber || ''}
                onChange={(e) => setBorrowerForm({...borrowerForm, socialSecurityNumber: e.target.value})}
                disabled={!isEditable || isSaving}
              />
            </div>
            <div>
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Input
                id="maritalStatus"
                value={borrowerForm.maritalStatus || ''}
                onChange={(e) => setBorrowerForm({...borrowerForm, maritalStatus: e.target.value})}
                disabled={!isEditable || isSaving}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dependents">Dependents</Label>
              <Input
                id="dependents"
                value={borrowerForm.dependents || ''}
                onChange={(e) => setBorrowerForm({...borrowerForm, dependents: e.target.value})}
                disabled={!isEditable || isSaving}
              />
            </div>
            <div>
              <Label htmlFor="citizenship">Citizenship</Label>
              <Input
                id="citizenship"
                value={borrowerForm.citizenship || ''}
                onChange={(e) => setBorrowerForm({...borrowerForm, citizenship: e.target.value})}
                disabled={!isEditable || isSaving}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleBorrowerSave} disabled={!isEditable || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Address</CardTitle>
          <CardDescription>Enter the borrower's current address details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="streetAddress">Street Address</Label>
            <Input
              id="streetAddress"
              value={currentAddressForm.streetAddress || ''}
              onChange={(e) => setCurrentAddressForm({...currentAddressForm, streetAddress: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="cityStateZip">City, State, Zip</Label>
            <Input
              id="cityStateZip"
              value={currentAddressForm.cityStateZip || ''}
              onChange={(e) => setCurrentAddressForm({...currentAddressForm, cityStateZip: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="durationAtAddress">Duration at Address</Label>
            <Input
              id="durationAtAddress"
              value={currentAddressForm.durationAtAddress || ''}
              onChange={(e) => setCurrentAddressForm({...currentAddressForm, durationAtAddress: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="housingStatus">Housing Status</Label>
            <Input
              id="housingStatus"
              value={currentAddressForm.housingStatus || ''}
              onChange={(e) => setCurrentAddressForm({...currentAddressForm, housingStatus: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="monthlyHousingExpense">Monthly Housing Expense</Label>
            <Input
              id="monthlyHousingExpense"
              value={currentAddressForm.monthlyHousingExpense || ''}
              onChange={(e) => setCurrentAddressForm({...currentAddressForm, monthlyHousingExpense: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCurrentAddressSave} disabled={!isEditable || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment Information</CardTitle>
          <CardDescription>Enter the borrower's employment details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="employerName">Employer Name</Label>
            <Input
              id="employerName"
              value={employmentForm.employerName || ''}
              onChange={(e) => setEmploymentForm({...employmentForm, employerName: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="employerAddress">Employer Address</Label>
            <Input
              id="employerAddress"
              value={employmentForm.employerAddress || ''}
              onChange={(e) => setEmploymentForm({...employmentForm, employerAddress: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={employmentForm.jobTitle || ''}
              onChange={(e) => setEmploymentForm({...employmentForm, jobTitle: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={employmentForm.startDate || ''}
                onChange={(e) => setEmploymentForm({...employmentForm, startDate: e.target.value})}
                disabled={!isEditable || isSaving}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date (if applicable)</Label>
              <Input
                type="date"
                id="endDate"
                value={employmentForm.endDate || ''}
                onChange={(e) => setEmploymentForm({...employmentForm, endDate: e.target.value})}
                disabled={!isEditable || isSaving}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="monthlyIncome">Monthly Income</Label>
            <Input
              id="monthlyIncome"
              value={employmentForm.monthlyIncome || ''}
              onChange={(e) => setEmploymentForm({...employmentForm, monthlyIncome: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="isSelfEmployed" className="text-sm font-medium">
              Self-Employed?
            </Label>
            <Switch
              id="isSelfEmployed"
              checked={employmentForm.isSelfEmployed}
              onCheckedChange={(checked) => setEmploymentForm({...employmentForm, isSelfEmployed: checked})}
              disabled={!isEditable || isSaving}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleEmploymentSave} disabled={!isEditable || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income Information</CardTitle>
          <CardDescription>Enter the borrower's income details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="baseIncome">Base Income</Label>
            <Input
              id="baseIncome"
              value={incomeForm.baseIncome || ''}
              onChange={(e) => setIncomeForm({...incomeForm, baseIncome: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="overtimeIncome">Overtime Income</Label>
            <Input
              id="overtimeIncome"
              value={incomeForm.overtimeIncome || ''}
              onChange={(e) => setIncomeForm({...incomeForm, overtimeIncome: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="otherIncome">Other Income</Label>
            <Input
              id="otherIncome"
              value={incomeForm.otherIncome || ''}
              onChange={(e) => setIncomeForm({...incomeForm, otherIncome: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleIncomeSave} disabled={!isEditable || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assets Information</CardTitle>
          <CardDescription>Enter the borrower's assets details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="bankAccounts">Bank Accounts</Label>
            <Input
              id="bankAccounts"
              value={assetsForm.bankAccounts || ''}
              onChange={(e) => setAssetsForm({...assetsForm, bankAccounts: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="investments">Investments</Label>
            <Input
              id="investments"
              value={assetsForm.investments || ''}
              onChange={(e) => setAssetsForm({...assetsForm, investments: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="realEstateAssets">Real Estate Assets</Label>
            <Input
              id="realEstateAssets"
              value={assetsForm.realEstateAssets || ''}
              onChange={(e) => setAssetsForm({...assetsForm, realEstateAssets: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="otherAssets">Other Assets</Label>
            <Input
              id="otherAssets"
              value={assetsForm.otherAssets || ''}
              onChange={(e) => setAssetsForm({...assetsForm, otherAssets: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleAssetsSave} disabled={!isEditable || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liabilities Information</CardTitle>
          <CardDescription>Enter the borrower's liabilities details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="creditCards">Credit Cards</Label>
            <Input
              id="creditCards"
              value={liabilitiesForm.creditCards || ''}
              onChange={(e) => setLiabilitiesForm({...liabilitiesForm, creditCards: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="autoLoans">Auto Loans</Label>
            <Input
              id="autoLoans"
              value={liabilitiesForm.autoLoans || ''}
              onChange={(e) => setLiabilitiesForm({...liabilitiesForm, autoLoans: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="studentLoans">Student Loans</Label>
            <Input
              id="studentLoans"
              value={liabilitiesForm.studentLoans || ''}
              onChange={(e) => setLiabilitiesForm({...liabilitiesForm, studentLoans: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="otherMortgages">Other Mortgages</Label>
            <Input
              id="otherMortgages"
              value={liabilitiesForm.otherMortgages || ''}
              onChange={(e) => setLiabilitiesForm({...liabilitiesForm, otherMortgages: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="personalLoans">Personal Loans</Label>
            <Input
              id="personalLoans"
              value={liabilitiesForm.personalLoans || ''}
              onChange={(e) => setLiabilitiesForm({...liabilitiesForm, personalLoans: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
           <div>
            <Label htmlFor="monthlyPayments">Monthly Payments</Label>
            <Input
              id="monthlyPayments"
              value={liabilitiesForm.monthlyPayments || ''}
              onChange={(e) => setLiabilitiesForm({...liabilitiesForm, monthlyPayments: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleLiabilitiesSave} disabled={!isEditable || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Property Information</CardTitle>
          <CardDescription>Enter the property details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="subjectPropertyAddress">Subject Property Address</Label>
            <Input
              id="subjectPropertyAddress"
              value={propertyForm.subjectPropertyAddress || ''}
              onChange={(e) => setPropertyForm({...propertyForm, subjectPropertyAddress: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="propertyValue">Property Value</Label>
            <Input
              id="propertyValue"
              value={propertyForm.propertyValue || ''}
              onChange={(e) => setPropertyForm({...propertyForm, propertyValue: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="loanAmount">Loan Amount</Label>
            <Input
              id="loanAmount"
              value={propertyForm.loanAmount || ''}
              onChange={(e) => setPropertyForm({...propertyForm, loanAmount: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="loanPurpose">Loan Purpose</Label>
            <Input
              id="loanPurpose"
              value={propertyForm.loanPurpose || ''}
              onChange={(e) => setPropertyForm({...propertyForm, loanPurpose: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="propertyType">Property Type</Label>
            <Input
              id="propertyType"
              value={propertyForm.propertyType || ''}
              onChange={(e) => setPropertyForm({...propertyForm, propertyType: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="occupancy">Occupancy</Label>
            <Input
              id="occupancy"
              value={propertyForm.occupancy || ''}
              onChange={(e) => setPropertyForm({...propertyForm, occupancy: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="titleType">Title Type</Label>
            <Input
              id="titleType"
              value={propertyForm.titleType || ''}
              onChange={(e) => setPropertyForm({...propertyForm, titleType: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handlePropertySave} disabled={!isEditable || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Declarations</CardTitle>
          <CardDescription>Answer the following declarations</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="hasBankruptcies" className="text-sm font-medium">
              Have you had any bankruptcies in the last 7 years?
            </label>
            <Switch
              id="hasBankruptcies"
              checked={declarationsForm.hasBankruptcies}
              onCheckedChange={(checked) => setDeclarationsForm({...declarationsForm, hasBankruptcies: checked})}
              disabled={!isEditable || isSaving}
            />
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="hasAlimonyObligation" className="text-sm font-medium">
              Do you have an obligation to pay alimony?
            </label>
            <Switch
              id="hasAlimonyObligation"
              checked={declarationsForm.hasAlimonyObligation}
              onCheckedChange={(checked) => setDeclarationsForm({...declarationsForm, hasAlimonyObligation: checked})}
              disabled={!isEditable || isSaving}
            />
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="isCoSigner" className="text-sm font-medium">
              Are you a co-signer on a loan?
            </label>
            <Switch
              id="isCoSigner"
              checked={declarationsForm.isCoSigner}
              onCheckedChange={(checked) => setDeclarationsForm({...declarationsForm, isCoSigner: checked})}
              disabled={!isEditable || isSaving}
            />
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="intendToOccupy" className="text-sm font-medium">
              Do you intend to occupy the property?
            </label>
            <Switch
              id="intendToOccupy"
              checked={declarationsForm.intendToOccupy || false}
              onCheckedChange={(checked) => setDeclarationsForm({...declarationsForm, intendToOccupy: checked})}
              disabled={!isEditable || isSaving}
            />
          </div>

          <div className="flex items-center space-x-2">
            <label htmlFor="isCitizen" className="text-sm font-medium">
              Are you a U.S. citizen or permanent resident?
            </label>
            <Switch
              id="isCitizen"
              checked={declarationsForm.isCitizen || false}
              onCheckedChange={(checked) => setDeclarationsForm({...declarationsForm, isCitizen: checked})}
              disabled={!isEditable || isSaving}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleDeclarationsSave} disabled={!isEditable || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demographic Information</CardTitle>
          <CardDescription>Enter the borrower's demographic details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="ethnicity">Ethnicity</Label>
            <Input
              id="ethnicity"
              value={demographicForm.ethnicity || ''}
              onChange={(e) => setDemographicForm({...demographicForm, ethnicity: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="race">Race</Label>
            <Input
              id="race"
              value={demographicForm.race || ''}
              onChange={(e) => setDemographicForm({...demographicForm, race: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="sex">Sex</Label>
            <Input
              id="sex"
              value={demographicForm.sex || ''}
              onChange={(e) => setDemographicForm({...demographicForm, sex: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="collectionMethod">Collection Method</Label>
            <Input
              id="collectionMethod"
              value={demographicForm.collectionMethod || ''}
              onChange={(e) => setDemographicForm({...demographicForm, collectionMethod: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleDemographicSave} disabled={!isEditable || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loan Information</CardTitle>
          <CardDescription>Enter the loan details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="loanType">Loan Type</Label>
            <Input
              id="loanType"
              value={loanForm.loanType || ''}
              onChange={(e) => setLoanForm({...loanForm, loanType: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="mortgageTerm">Mortgage Term</Label>
            <Input
              id="mortgageTerm"
              value={loanForm.mortgageTerm || ''}
              onChange={(e) => setLoanForm({...loanForm, mortgageTerm: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="amortizationType">Amortization Type</Label>
            <Input
              id="amortizationType"
              value={loanForm.amortizationType || ''}
              onChange={(e) => setLoanForm({...loanForm, amortizationType: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div>
            <Label htmlFor="interestRate">Interest Rate</Label>
            <Input
              id="interestRate"
              value={loanForm.interestRate || ''}
              onChange={(e) => setLoanForm({...loanForm, interestRate: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
           <div>
            <Label htmlFor="mortgageInsurance">Mortgage Insurance</Label>
            <Input
              id="mortgageInsurance"
              value={loanForm.mortgageInsurance || ''}
              onChange={(e) => setLoanForm({...loanForm, mortgageInsurance: e.target.value})}
              disabled={!isEditable || isSaving}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleLoanSave} disabled={!isEditable || isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Mortgage1003Form;
