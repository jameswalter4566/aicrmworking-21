import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext";
import { useIndustry } from "@/context/IndustryContext";
import { leadProfileService } from "@/services/leadProfile";
import { useNavigate, useParams } from "react-router-dom";
import { thoughtlyService } from "@/services/thoughtly";

// Define the structure for the Mortgage 1003 form
export interface Mortgage1003Form {
  borrower?: {
    fullLegalName?: string;
    dateOfBirth?: string;
    socialSecurityNumber?: string;
    maritalStatus?: string;
    dependents?: string;
    citizenship?: string;
  };
  currentAddress?: {
    streetAddress?: string;
    cityStateZip?: string;
    durationAtAddress?: string;
    housingStatus?: string;
    monthlyHousingExpense?: string;
  };
  employment?: {
    employerName?: string;
    employerAddress?: string;
    jobTitle?: string;
    startDate?: string;
    endDate?: string;
    monthlyIncome?: string;
    isSelfEmployed?: boolean;
  };
  income?: {
    baseIncome?: string;
    overtimeIncome?: string;
    otherIncome?: string;
  };
  assets?: {
    bankAccounts?: string;
    investments?: string;
    realEstateAssets?: string;
    otherAssets?: string;
  };
  liabilities?: {
    creditCards?: string;
    autoLoans?: string;
    studentLoans?: string;
    otherMortgages?: string;
    personalLoans?: string;
    monthlyPayments?: string;
  };
  property?: {
    subjectPropertyAddress?: string;
    propertyValue?: string;
    loanAmount?: string;
    loanPurpose?: string;
    propertyType?: string;
    occupancy?: string;
    titleType?: string;
  };
  declarations?: {
    hasBankruptcies?: boolean;
    hasAlimonyObligation?: boolean;
    isCoSigner?: boolean;
    intendToOccupy?: boolean;
    isCitizen?: boolean;
  };
  demographic?: {
    ethnicity?: string;
    race?: string;
    sex?: string;
    collectionMethod?: string;
  };
  loan?: {
    loanType?: string;
    mortgageTerm?: string;
    amortizationType?: string;
    interestRate?: string;
    mortgageInsurance?: string;
  };
}

const Mortgage1003Form: React.FC = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeIndustry } = useIndustry();
  const [formData, setFormData] = useState<Mortgage1003Form>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushingToPipeline, setPushingToPipeline] = useState(false);

  useEffect(() => {
    const fetchLeadData = async () => {
      if (leadId) {
        setLoading(true);
        try {
          const lead = await leadProfileService.getLeadById(leadId);
          if (lead && lead.mortgageData) {
            setFormData(lead.mortgageData);
          }
        } catch (error) {
          console.error("Error fetching lead data:", error);
          toast.error("Failed to load lead data");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchLeadData();
  }, [leadId]);

  const handleChange = (section: string, field: string, value: any) => {
    setFormData(prevData => {
      const updatedSection = { ...(prevData[section] || {}), [field]: value };
      return { ...prevData, [section]: updatedSection };
    });
  };

  const handleCheckboxChange = (section: string, field: string, checked: boolean) => {
    setFormData(prevData => {
      const updatedSection = { ...(prevData[section] || {}), [field]: checked };
      return { ...prevData, [section]: updatedSection };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) {
      toast.error("Lead ID is missing.");
      return;
    }

    setSaving(true);
    try {
      // Call the updateMortgageData function
      await leadProfileService.updateMortgageData(leadId, 'borrower', formData.borrower || {});
      await leadProfileService.updateMortgageData(leadId, 'currentAddress', formData.currentAddress || {});
      await leadProfileService.updateMortgageData(leadId, 'employment', formData.employment || {});
      await leadProfileService.updateMortgageData(leadId, 'income', formData.income || {});
      await leadProfileService.updateMortgageData(leadId, 'assets', formData.assets || {});
      await leadProfileService.updateMortgageData(leadId, 'liabilities', formData.liabilities || {});
      await leadProfileService.updateMortgageData(leadId, 'property', formData.property || {});
      await leadProfileService.updateMortgageData(leadId, 'declarations', formData.declarations || {});
      await leadProfileService.updateMortgageData(leadId, 'demographic', formData.demographic || {});
      await leadProfileService.updateMortgageData(leadId, 'loan', formData.loan || {});

      toast.success("Mortgage data updated successfully!");
    } catch (error) {
      console.error("Error updating mortgage data:", error);
      toast.error("Failed to update mortgage data");
    } finally {
      setSaving(false);
    }
  };

  const handlePushToPipeline = async () => {
    if (!leadId) {
      toast.error("Lead ID is missing.");
      return;
    }

    setPushingToPipeline(true);
    try {
      // Update the lead to mark it as a mortgage lead and set the addedToPipelineAt timestamp
      await leadProfileService.updateLead(leadId, {
        isMortgageLead: true,
        addedToPipelineAt: new Date().toISOString()
      });

      toast.success("Lead pushed to mortgage pipeline!");
      navigate('/pipeline'); // Redirect to the pipeline page
    } catch (error) {
      console.error("Error pushing lead to pipeline:", error);
      toast.error("Failed to push lead to pipeline");
    } finally {
      setPushingToPipeline(false);
    }
  };

  if (activeIndustry !== "mortgage") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
        <h2 className="text-2xl font-semibold mb-2">Mortgage Application</h2>
        <p className="text-gray-500">
          Mortgage application is only available in the mortgage industry mode.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center">Loading mortgage application form...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Borrower Information */}
      <Card>
        <CardHeader>
          <CardTitle>Borrower Information</CardTitle>
          <CardDescription>Enter the borrower's personal details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullLegalName">Full Legal Name</Label>
              <Input
                type="text"
                id="fullLegalName"
                value={formData.borrower?.fullLegalName || ""}
                onChange={(e) => handleChange("borrower", "fullLegalName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                type="date"
                id="dateOfBirth"
                value={formData.borrower?.dateOfBirth || ""}
                onChange={(e) => handleChange("borrower", "dateOfBirth", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="socialSecurityNumber">Social Security Number</Label>
              <Input
                type="text"
                id="socialSecurityNumber"
                value={formData.borrower?.socialSecurityNumber || ""}
                onChange={(e) => handleChange("borrower", "socialSecurityNumber", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select onValueChange={(value) => handleChange("borrower", "maritalStatus", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" defaultValue={formData.borrower?.maritalStatus || ""} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dependents">Number of Dependents</Label>
              <Input
                type="number"
                id="dependents"
                value={formData.borrower?.dependents || ""}
                onChange={(e) => handleChange("borrower", "dependents", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="citizenship">Citizenship</Label>
              <Input
                type="text"
                id="citizenship"
                value={formData.borrower?.citizenship || ""}
                onChange={(e) => handleChange("borrower", "citizenship", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Address */}
      <Card>
        <CardHeader>
          <CardTitle>Current Address</CardTitle>
          <CardDescription>Enter the borrower's current address details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="streetAddress">Street Address</Label>
              <Input
                type="text"
                id="streetAddress"
                value={formData.currentAddress?.streetAddress || ""}
                onChange={(e) => handleChange("currentAddress", "streetAddress", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cityStateZip">City, State, Zip</Label>
              <Input
                type="text"
                id="cityStateZip"
                value={formData.currentAddress?.cityStateZip || ""}
                onChange={(e) => handleChange("currentAddress", "cityStateZip", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="durationAtAddress">Duration at Address</Label>
              <Input
                type="text"
                id="durationAtAddress"
                value={formData.currentAddress?.durationAtAddress || ""}
                onChange={(e) => handleChange("currentAddress", "durationAtAddress", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="housingStatus">Housing Status</Label>
              <Select onValueChange={(value) => handleChange("currentAddress", "housingStatus", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" defaultValue={formData.currentAddress?.housingStatus || ""} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Own">Own</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="monthlyHousingExpense">Monthly Housing Expense</Label>
            <Input
              type="text"
              id="monthlyHousingExpense"
              value={formData.currentAddress?.monthlyHousingExpense || ""}
              onChange={(e) => handleChange("currentAddress", "monthlyHousingExpense", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Employment Information</CardTitle>
          <CardDescription>Enter the borrower's employment details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employerName">Employer Name</Label>
              <Input
                type="text"
                id="employerName"
                value={formData.employment?.employerName || ""}
                onChange={(e) => handleChange("employment", "employerName", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="employerAddress">Employer Address</Label>
              <Input
                type="text"
                id="employerAddress"
                value={formData.employment?.employerAddress || ""}
                onChange={(e) => handleChange("employment", "employerAddress", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                type="text"
                id="jobTitle"
                value={formData.employment?.jobTitle || ""}
                onChange={(e) => handleChange("employment", "jobTitle", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={formData.employment?.startDate || ""}
                onChange={(e) => handleChange("employment", "startDate", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="endDate">End Date (if applicable)</Label>
              <Input
                type="date"
                id="endDate"
                value={formData.employment?.endDate || ""}
                onChange={(e) => handleChange("employment", "endDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="monthlyIncome">Monthly Income</Label>
              <Input
                type="text"
                id="monthlyIncome"
                value={formData.employment?.monthlyIncome || ""}
                onChange={(e) => handleChange("employment", "monthlyIncome", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="isSelfEmployed">
              <Checkbox
                id="isSelfEmployed"
                checked={formData.employment?.isSelfEmployed || false}
                onCheckedChange={(checked) => handleCheckboxChange("employment", "isSelfEmployed", checked || false)}
              />
              <span>Is Self-Employed</span>
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Income Information */}
      <Card>
        <CardHeader>
          <CardTitle>Income Information</CardTitle>
          <CardDescription>Enter the borrower's income details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="baseIncome">Base Income</Label>
              <Input
                type="text"
                id="baseIncome"
                value={formData.income?.baseIncome || ""}
                onChange={(e) => handleChange("income", "baseIncome", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="overtimeIncome">Overtime Income</Label>
              <Input
                type="text"
                id="overtimeIncome"
                value={formData.income?.overtimeIncome || ""}
                onChange={(e) => handleChange("income", "overtimeIncome", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="otherIncome">Other Income</Label>
            <Input
              type="text"
              id="otherIncome"
              value={formData.income?.otherIncome || ""}
              onChange={(e) => handleChange("income", "otherIncome", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Assets Information */}
      <Card>
        <CardHeader>
          <CardTitle>Assets Information</CardTitle>
          <CardDescription>Enter the borrower's assets details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bankAccounts">Bank Accounts</Label>
              <Input
                type="text"
                id="bankAccounts"
                value={formData.assets?.bankAccounts || ""}
                onChange={(e) => handleChange("assets", "bankAccounts", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="investments">Investments</Label>
              <Input
                type="text"
                id="investments"
                value={formData.assets?.investments || ""}
                onChange={(e) => handleChange("assets", "investments", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="realEstateAssets">Real Estate Assets</Label>
              <Input
                type="text"
                id="realEstateAssets"
                value={formData.assets?.realEstateAssets || ""}
                onChange={(e) => handleChange("assets", "realEstateAssets", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="otherAssets">Other Assets</Label>
              <Input
                type="text"
                id="otherAssets"
                value={formData.assets?.otherAssets || ""}
                onChange={(e) => handleChange("assets", "otherAssets", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liabilities Information */}
      <Card>
        <CardHeader>
          <CardTitle>Liabilities Information</CardTitle>
          <CardDescription>Enter the borrower's liabilities details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="creditCards">Credit Cards</Label>
              <Input
                type="text"
                id="creditCards"
                value={formData.liabilities?.creditCards || ""}
                onChange={(e) => handleChange("liabilities", "creditCards", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="autoLoans">Auto Loans</Label>
              <Input
                type="text"
                id="autoLoans"
                value={formData.liabilities?.autoLoans || ""}
                onChange={(e) => handleChange("liabilities", "autoLoans", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="studentLoans">Student Loans</Label>
              <Input
                type="text"
                id="studentLoans"
                value={formData.liabilities?.studentLoans || ""}
                onChange={(e) => handleChange("liabilities", "studentLoans", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="otherMortgages">Other Mortgages</Label>
              <Input
                type="text"
                id="otherMortgages"
                value={formData.liabilities?.otherMortgages || ""}
                onChange={(e) => handleChange("liabilities", "otherMortgages", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="personalLoans">Personal Loans</Label>
              <Input
                type="text"
                id="personalLoans"
                value={formData.liabilities?.personalLoans || ""}
                onChange={(e) => handleChange("liabilities", "personalLoans", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="monthlyPayments">Monthly Payments</Label>
              <Input
                type="text"
                id="monthlyPayments"
                value={formData.liabilities?.monthlyPayments || ""}
                onChange={(e) => handleChange("liabilities", "monthlyPayments", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Information */}
      <Card>
        <CardHeader>
          <CardTitle>Property Information</CardTitle>
          <CardDescription>Enter the details of the property for which the loan is being applied.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="subjectPropertyAddress">Subject Property Address</Label>
            <Input
              type="text"
              id="subjectPropertyAddress"
              value={formData.property?.subjectPropertyAddress || ""}
              onChange={(e) => handleChange("property", "subjectPropertyAddress", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="propertyValue">Property Value</Label>
              <Input
                type="text"
                id="propertyValue"
                value={formData.property?.propertyValue || ""}
                onChange={(e) => handleChange("property", "propertyValue", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="loanAmount">Loan Amount</Label>
              <Input
                type="text"
                id="loanAmount"
                value={formData.property?.loanAmount || ""}
                onChange={(e) => handleChange("property", "loanAmount", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loanPurpose">Loan Purpose</Label>
              <Input
                type="text"
                id="loanPurpose"
                value={formData.property?.loanPurpose || ""}
                onChange={(e) => handleChange("property", "loanPurpose", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="propertyType">Property Type</Label>
              <Select onValueChange={(value) => handleChange("property", "propertyType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" defaultValue={formData.property?.propertyType || ""} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single Family">Single Family</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="occupancy">Occupancy</Label>
              <Select onValueChange={(value) => handleChange("property", "occupancy", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" defaultValue={formData.property?.occupancy || ""} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Primary Residence">Primary Residence</SelectItem>
                  <SelectItem value="Secondary Residence">Secondary Residence</SelectItem>
                  <SelectItem value="Investment Property">Investment Property</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="titleType">Title Type</Label>
              <Input
                type="text"
                id="titleType"
                value={formData.property?.titleType || ""}
                onChange={(e) => handleChange("property", "titleType", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Declarations */}
      <Card>
        <CardHeader>
          <CardTitle>Declarations</CardTitle>
          <CardDescription>Answer the following declarations.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="hasBankruptcies">
              <Checkbox
                id="hasBankruptcies"
                checked={formData.declarations?.hasBankruptcies || false}
                onCheckedChange={(checked) => handleCheckboxChange("declarations", "hasBankruptcies", checked || false)}
              />
              <span>Have you had bankruptcies in the last 7 years?</span>
            </Label>
          </div>
          <div>
            <Label htmlFor="hasAlimonyObligation">
              <Checkbox
                id="hasAlimonyObligation"
                checked={formData.declarations?.hasAlimonyObligation || false}
                onCheckedChange={(checked) => handleCheckboxChange("declarations", "hasAlimonyObligation", checked || false)}
              />
              <span>Do you have alimony obligations?</span>
            </Label>
          </div>
          <div>
            <Label htmlFor="isCoSigner">
              <Checkbox
                id="isCoSigner"
                checked={formData.declarations?.isCoSigner || false}
                onCheckedChange={(checked) => handleCheckboxChange("declarations", "isCoSigner", checked || false)}
              />
              <span>Are you a co-signer on any debt?</span>
            </Label>
          </div>
          <div>
            <Label htmlFor="intendToOccupy">
              <Checkbox
                id="intendToOccupy"
                checked={formData.declarations?.intendToOccupy || false}
                onCheckedChange={(checked) => handleCheckboxChange("declarations", "intendToOccupy", checked || false)}
              />
              <span>Do you intend to occupy the property as your primary residence?</span>
            </Label>
          </div>
          <div>
            <Label htmlFor="isCitizen">
              <Checkbox
                id="isCitizen"
                checked={formData.declarations?.isCitizen || false}
                onCheckedChange={(checked) => handleCheckboxChange("declarations", "isCitizen", checked || false)}
              />
              <span>Are you a U.S. citizen?</span>
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Demographic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Demographic Information</CardTitle>
          <CardDescription>Provide demographic information for government monitoring purposes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="ethnicity">Ethnicity</Label>
            <Input
              type="text"
              id="ethnicity"
              value={formData.demographic?.ethnicity || ""}
              onChange={(e) => handleChange("demographic", "ethnicity", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="race">Race</Label>
            <Input
              type="text"
              id="race"
              value={formData.demographic?.race || ""}
              onChange={(e) => handleChange("demographic", "race", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sex">Sex</Label>
            <Select onValueChange={(value) => handleChange("demographic", "sex", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" defaultValue={formData.demographic?.sex || ""} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="collectionMethod">Collection Method</Label>
            <Input
              type="text"
              id="collectionMethod"
              value={formData.demographic?.collectionMethod || ""}
              onChange={(e) => handleChange("demographic", "collectionMethod", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loan Details */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
          <CardDescription>Enter the details of the loan.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loanType">Loan Type</Label>
              <Select onValueChange={(value) => handleChange("loan", "loanType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" defaultValue={formData.loan?.loanType || ""} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conventional">Conventional</SelectItem>
                  <SelectItem value="FHA">FHA</SelectItem>
                  <SelectItem value="VA">VA</SelectItem>
                  <SelectItem value="USDA">USDA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mortgageTerm">Mortgage Term</Label>
              <Input
                type="text"
                id="mortgageTerm"
                value={formData.loan?.mortgageTerm || ""}
                onChange={(e) => handleChange("loan", "mortgageTerm", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amortizationType">Amortization Type</Label>
              <Select onValueChange={(value) => handleChange("loan", "amortizationType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" defaultValue={formData.loan?.amortizationType || ""} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">Fixed</SelectItem>
                  <SelectItem value="Adjustable">Adjustable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="interestRate">Interest Rate</Label>
              <Input
                type="text"
                id="interestRate"
                value={formData.loan?.interestRate || ""}
                onChange={(e) => handleChange("loan", "interestRate", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="mortgageInsurance">Mortgage Insurance</Label>
            <Input
              type="text"
              id="mortgageInsurance"
              value={formData.loan?.mortgageInsurance || ""}
              onChange={(e) => handleChange("loan", "mortgageInsurance", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="status">Loan Status</Label>
            <Select onValueChange={(value) => handleChange("loan", "status", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" defaultValue={formData.loan?.status || ""} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-between">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Updates"}
        </Button>
        <Button 
          type="button" 
          variant="secondary" 
          onClick={handlePushToPipeline} 
          disabled={pushingToPipeline}
        >
          {pushingToPipeline ? "Pushing to Pipeline..." : "Push to Pipeline"}
        </Button>
      </div>
    </form>
  );
};

export default Mortgage1003Form;
