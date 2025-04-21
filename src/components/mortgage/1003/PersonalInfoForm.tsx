
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PersonalInfoFormProps {
  leadId: string;
  mortgageData?: any;
  isEditable?: boolean;
  onSave?: (data: any) => Promise<void>;
}

export const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ 
  leadId,
  mortgageData = {},
  isEditable = true,
  onSave
}) => {
  // Extract personal info, handling different data structures
  // This accounts for both direct structure and nested structure under borrower.data
  const getBorrowerData = () => {
    // First check if we have data in borrower.data path
    if (mortgageData.borrower?.data?.personalInfo) {
      return {
        personalInfo: mortgageData.borrower.data.personalInfo || {},
        contactDetails: mortgageData.borrower.data.contactDetails || {},
        addressHistory: mortgageData.borrower.data.addressHistory || {}
      };
    }
    
    // Then check if we have data in personalInfo path
    if (mortgageData.personalInfo) {
      return {
        personalInfo: mortgageData.personalInfo.personalInfo || {},
        contactDetails: mortgageData.personalInfo.contactDetails || {},
        addressHistory: mortgageData.personalInfo.addressHistory || {}
      };
    }
    
    // Default to empty objects
    return {
      personalInfo: {},
      contactDetails: {},
      addressHistory: {}
    };
  };

  const borrowerData = getBorrowerData();
  const personalInfo = borrowerData.personalInfo;
  const contactDetails = borrowerData.contactDetails;
  const addressHistory = borrowerData.addressHistory;

  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for personal info section
  const [formData, setFormData] = useState({
    // Primary Information
    firstName: personalInfo.firstName || "",
    middleName: personalInfo.middleName || "",
    lastName: personalInfo.lastName || "",
    suffix: personalInfo.suffix || "",
    socialSecurityNumber: personalInfo.socialSecurityNumber || "",
    dateOfBirth: personalInfo.dateOfBirth || "",
    maritalStatus: personalInfo.maritalStatus || "",
    numberOfDependents: personalInfo.numberOfDependents || "0",
    ageOfDependents: personalInfo.ageOfDependents || "",
    joinedToBorrower: personalInfo.joinedToBorrower || false,
    taxFilingAddressSameAs: personalInfo.taxFilingAddressSameAs || "",
    presentAddressSameAs: personalInfo.presentAddressSameAs || "",
    citizenship: personalInfo.citizenship || "U.S. Citizen",
    isVeteran: personalInfo.isVeteran || false,
    
    // Contact Details
    homePhoneNumber: contactDetails.homePhoneNumber || "",
    cellPhoneNumber: contactDetails.cellPhoneNumber || "",
    workPhoneNumber: contactDetails.workPhoneNumber || "",
    workPhoneExt: contactDetails.workPhoneExt || "",
    emailAddress: contactDetails.emailAddress || "",
    noEmail: contactDetails.noEmail || false,
    
    // Present Address
    presentAddressLine1: addressHistory.presentAddressLine1 || "",
    presentAddressUnit: addressHistory.presentAddressUnit || "",
    presentCity: addressHistory.presentCity || "",
    presentState: addressHistory.presentState || "",
    presentZipCode: addressHistory.presentZipCode || "",
    presentCountry: addressHistory.presentCountry || "USA",
    presentTimeAtResidence: addressHistory.presentTimeAtResidence || "1",
    presentOwnership: addressHistory.presentOwnership || "",
    
    // Previous Address
    previousAddressLine1: addressHistory.previousAddressLine1 || "",
    previousAddressUnit: addressHistory.previousAddressUnit || "",
    previousCity: addressHistory.previousCity || "",
    previousState: addressHistory.previousState || "",
    previousZipCode: addressHistory.previousZipCode || "",
    previousCountry: addressHistory.previousCountry || "USA",
    previousTimeAtResidence: addressHistory.previousTimeAtResidence || "",
    previousOwnership: addressHistory.previousOwnership || "",
    previousRentAmount: addressHistory.previousRentAmount || "",
    
    // Mailing Address
    mailingAddressSameAsPresent: addressHistory.mailingAddressSameAsPresent || true,
    mailingAddressLine1: addressHistory.mailingAddressLine1 || "",
    mailingAddressUnit: addressHistory.mailingAddressUnit || ""
  });

  // Update form data when mortgageData changes
  useEffect(() => {
    const borrowerData = getBorrowerData();
    const personalInfo = borrowerData.personalInfo;
    const contactDetails = borrowerData.contactDetails;
    const addressHistory = borrowerData.addressHistory;

    setFormData({
      // Primary Information
      firstName: personalInfo.firstName || "",
      middleName: personalInfo.middleName || "",
      lastName: personalInfo.lastName || "",
      suffix: personalInfo.suffix || "",
      socialSecurityNumber: personalInfo.socialSecurityNumber || "",
      dateOfBirth: personalInfo.dateOfBirth || "",
      maritalStatus: personalInfo.maritalStatus || "",
      numberOfDependents: personalInfo.numberOfDependents || "0",
      ageOfDependents: personalInfo.ageOfDependents || "",
      joinedToBorrower: personalInfo.joinedToBorrower || false,
      taxFilingAddressSameAs: personalInfo.taxFilingAddressSameAs || "",
      presentAddressSameAs: personalInfo.presentAddressSameAs || "",
      citizenship: personalInfo.citizenship || "U.S. Citizen",
      isVeteran: personalInfo.isVeteran || false,
      
      // Contact Details
      homePhoneNumber: contactDetails.homePhoneNumber || "",
      cellPhoneNumber: contactDetails.cellPhoneNumber || "",
      workPhoneNumber: contactDetails.workPhoneNumber || "",
      workPhoneExt: contactDetails.workPhoneExt || "",
      emailAddress: contactDetails.emailAddress || "",
      noEmail: contactDetails.noEmail || false,
      
      // Present Address
      presentAddressLine1: addressHistory.presentAddressLine1 || "",
      presentAddressUnit: addressHistory.presentAddressUnit || "",
      presentCity: addressHistory.presentCity || "",
      presentState: addressHistory.presentState || "",
      presentZipCode: addressHistory.presentZipCode || "",
      presentCountry: addressHistory.presentCountry || "USA",
      presentTimeAtResidence: addressHistory.presentTimeAtResidence || "1",
      presentOwnership: addressHistory.presentOwnership || "",
      
      // Previous Address
      previousAddressLine1: addressHistory.previousAddressLine1 || "",
      previousAddressUnit: addressHistory.previousAddressUnit || "",
      previousCity: addressHistory.previousCity || "",
      previousState: addressHistory.previousState || "",
      previousZipCode: addressHistory.previousZipCode || "",
      previousCountry: addressHistory.previousCountry || "USA",
      previousTimeAtResidence: addressHistory.previousTimeAtResidence || "",
      previousOwnership: addressHistory.previousOwnership || "",
      previousRentAmount: addressHistory.previousRentAmount || "",
      
      // Mailing Address
      mailingAddressSameAsPresent: addressHistory.mailingAddressSameAsPresent || true,
      mailingAddressLine1: addressHistory.mailingAddressLine1 || "",
      mailingAddressUnit: addressHistory.mailingAddressUnit || ""
    });
  }, [mortgageData]);

  // Handle input changes
  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isEditable) return;
    
    setIsSaving(true);
    try {
      const updatedData = {
        personalInfo: {
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          suffix: formData.suffix,
          socialSecurityNumber: formData.socialSecurityNumber,
          dateOfBirth: formData.dateOfBirth,
          maritalStatus: formData.maritalStatus,
          numberOfDependents: formData.numberOfDependents,
          ageOfDependents: formData.ageOfDependents,
          joinedToBorrower: formData.joinedToBorrower,
          taxFilingAddressSameAs: formData.taxFilingAddressSameAs,
          presentAddressSameAs: formData.presentAddressSameAs,
          citizenship: formData.citizenship,
          isVeteran: formData.isVeteran
        },
        contactDetails: {
          homePhoneNumber: formData.homePhoneNumber,
          cellPhoneNumber: formData.cellPhoneNumber,
          workPhoneNumber: formData.workPhoneNumber,
          workPhoneExt: formData.workPhoneExt,
          emailAddress: formData.emailAddress,
          noEmail: formData.noEmail
        },
        addressHistory: {
          presentAddressLine1: formData.presentAddressLine1,
          presentAddressUnit: formData.presentAddressUnit,
          presentCity: formData.presentCity,
          presentState: formData.presentState,
          presentZipCode: formData.presentZipCode,
          presentCountry: formData.presentCountry,
          presentTimeAtResidence: formData.presentTimeAtResidence,
          presentOwnership: formData.presentOwnership,
          previousAddressLine1: formData.previousAddressLine1,
          previousAddressUnit: formData.previousAddressUnit,
          previousCity: formData.previousCity,
          previousState: formData.previousState,
          previousZipCode: formData.previousZipCode,
          previousCountry: formData.previousCountry,
          previousTimeAtResidence: formData.previousTimeAtResidence,
          previousOwnership: formData.previousOwnership,
          previousRentAmount: formData.previousRentAmount,
          mailingAddressSameAsPresent: formData.mailingAddressSameAsPresent,
          mailingAddressLine1: formData.mailingAddressLine1,
          mailingAddressUnit: formData.mailingAddressUnit
        }
      };

      // If onSave prop is provided, use it
      if (onSave) {
        await onSave({
          section: "personalInfo",
          data: updatedData
        });
      } else {
        // Otherwise use direct update
        const { mortgageData: existingData = {} } = await getLeadData(leadId);
        
        const updatedMortgageData = {
          ...existingData,
          ...updatedData
        };
        
        await updateLead(leadId, updatedMortgageData);
      }
      
      toast.success("Personal information saved successfully");
    } catch (error) {
      console.error("Error saving personal information:", error);
      toast.error("Failed to save personal information");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to get lead data
  const getLeadData = async (leadId: string) => {
    const { data, error } = await supabase.functions.invoke('retrieve-leads', {
      body: { leadId }
    });
    
    if (error || !data.success) {
      throw new Error(error || data.error || "Failed to retrieve lead data");
    }
    
    return data.data[0] || {};
  };

  // Helper function to update lead
  const updateLead = async (leadId: string, mortgageData: any) => {
    const { data, error } = await supabase.functions.invoke('update-lead', {
      body: { 
        leadId,
        leadData: { mortgageData }
      }
    });
    
    if (error || !data.success) {
      throw new Error(error || data.error || "Failed to update lead");
    }
    
    return data;
  };

  return (
    <div className="space-y-8">
      {/* Primary Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Primary Information</h3>
        <Separator />
        
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input 
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="middleName">Middle Name</Label>
            <Input 
              id="middleName"
              value={formData.middleName}
              onChange={(e) => handleInputChange("middleName", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input 
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suffix">Suffix</Label>
            <Select
              value={formData.suffix}
              onValueChange={(value) => handleInputChange("suffix", value)}
              disabled={!isEditable || isSaving}
            >
              <SelectTrigger id="suffix">
                <SelectValue placeholder="Select suffix" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Jr.">Jr.</SelectItem>
                <SelectItem value="Sr.">Sr.</SelectItem>
                <SelectItem value="II">II</SelectItem>
                <SelectItem value="III">III</SelectItem>
                <SelectItem value="IV">IV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="socialSecurityNumber">Social Security Number</Label>
            <Input 
              id="socialSecurityNumber"
              value={formData.socialSecurityNumber}
              onChange={(e) => handleInputChange("socialSecurityNumber", e.target.value)}
              placeholder="XXX-XX-XXXX"
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input 
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maritalStatus">Marital Status</Label>
            <Select
              value={formData.maritalStatus}
              onValueChange={(value) => handleInputChange("maritalStatus", value)}
              disabled={!isEditable || isSaving}
            >
              <SelectTrigger id="maritalStatus">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Separated">Separated</SelectItem>
                <SelectItem value="Unmarried">Unmarried</SelectItem>
                <SelectItem value="Civil Union">Civil Union</SelectItem>
                <SelectItem value="Domestic Partnership">Domestic Partnership</SelectItem>
                <SelectItem value="Registered Reciprocal Beneficiary Relationship">Registered Reciprocal Beneficiary Relationship</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberOfDependents">No. of Dependents</Label>
            <Input 
              id="numberOfDependents"
              type="number"
              min="0"
              value={formData.numberOfDependents}
              onChange={(e) => handleInputChange("numberOfDependents", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ageOfDependents">Age of Dependents</Label>
            <Input 
              id="ageOfDependents"
              value={formData.ageOfDependents}
              onChange={(e) => handleInputChange("ageOfDependents", e.target.value)}
              placeholder="e.g., 10, 12, 15"
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2 flex items-center pt-8">
            <Switch
              id="joinedToBorrower"
              checked={formData.joinedToBorrower}
              onCheckedChange={(checked) => handleInputChange("joinedToBorrower", checked)}
              disabled={!isEditable || isSaving}
            />
            <Label htmlFor="joinedToBorrower" className="ml-2">Joined to Borrower</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxFilingAddressSameAs">Tax Filing Address Same As</Label>
            <Input 
              id="taxFilingAddressSameAs"
              value={formData.taxFilingAddressSameAs}
              onChange={(e) => handleInputChange("taxFilingAddressSameAs", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presentAddressSameAs">Present Address Same As</Label>
            <Input 
              id="presentAddressSameAs"
              value={formData.presentAddressSameAs}
              onChange={(e) => handleInputChange("presentAddressSameAs", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="citizenship">Citizenship</Label>
            <Select
              value={formData.citizenship}
              onValueChange={(value) => handleInputChange("citizenship", value)}
              disabled={!isEditable || isSaving}
            >
              <SelectTrigger id="citizenship">
                <SelectValue placeholder="Select citizenship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="U.S. Citizen">U.S. Citizen</SelectItem>
                <SelectItem value="Permanent Resident Alien">Permanent Resident Alien</SelectItem>
                <SelectItem value="Non-Permanent Resident Alien">Non-Permanent Resident Alien</SelectItem>
                <SelectItem value="Foreign National">Foreign National</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex items-center pt-8">
            <Switch
              id="isVeteran"
              checked={formData.isVeteran}
              onCheckedChange={(checked) => handleInputChange("isVeteran", checked)}
              disabled={!isEditable || isSaving}
            />
            <Label htmlFor="isVeteran" className="ml-2">Veteran</Label>
          </div>
        </div>
      </div>

      {/* Contact Details Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Contact Details</h3>
        <Separator />
        
        {/* Row 5 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="homePhoneNumber">Home Phone Number</Label>
            <Input 
              id="homePhoneNumber"
              value={formData.homePhoneNumber}
              onChange={(e) => handleInputChange("homePhoneNumber", e.target.value)}
              placeholder="(XXX) XXX-XXXX"
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cellPhoneNumber">Cell Phone Number</Label>
            <Input 
              id="cellPhoneNumber"
              value={formData.cellPhoneNumber}
              onChange={(e) => handleInputChange("cellPhoneNumber", e.target.value)}
              placeholder="(XXX) XXX-XXXX"
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workPhoneNumber">Work Phone Number</Label>
            <Input 
              id="workPhoneNumber"
              value={formData.workPhoneNumber}
              onChange={(e) => handleInputChange("workPhoneNumber", e.target.value)}
              placeholder="(XXX) XXX-XXXX"
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workPhoneExt">Ext.</Label>
            <Input 
              id="workPhoneExt"
              value={formData.workPhoneExt}
              onChange={(e) => handleInputChange("workPhoneExt", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
        </div>

        {/* Row 6 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 col-span-3">
            <Label htmlFor="emailAddress">Email Address</Label>
            <Input 
              id="emailAddress"
              type="email"
              value={formData.emailAddress}
              onChange={(e) => handleInputChange("emailAddress", e.target.value)}
              disabled={!isEditable || isSaving || formData.noEmail}
            />
          </div>
          <div className="space-y-2 flex items-center pt-8">
            <Switch
              id="noEmail"
              checked={formData.noEmail}
              onCheckedChange={(checked) => {
                handleInputChange("noEmail", checked);
                if (checked) {
                  handleInputChange("emailAddress", "");
                }
              }}
              disabled={!isEditable || isSaving}
            />
            <Label htmlFor="noEmail" className="ml-2">No Email</Label>
          </div>
        </div>
      </div>

      {/* Address History Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Address History</h3>
        <Separator />
        
        <h4 className="text-md font-medium mt-4">Present Address</h4>
        
        {/* Row 7 - Present Address */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 col-span-3">
            <Label htmlFor="presentAddressLine1">Address Line 1</Label>
            <Input 
              id="presentAddressLine1"
              value={formData.presentAddressLine1}
              onChange={(e) => handleInputChange("presentAddressLine1", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presentAddressUnit">Unit #</Label>
            <Input 
              id="presentAddressUnit"
              value={formData.presentAddressUnit}
              onChange={(e) => handleInputChange("presentAddressUnit", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
        </div>

        {/* Row 8 - Present Address continued */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="presentCity">City</Label>
            <Input 
              id="presentCity"
              value={formData.presentCity}
              onChange={(e) => handleInputChange("presentCity", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presentState">State</Label>
            <Input 
              id="presentState"
              value={formData.presentState}
              onChange={(e) => handleInputChange("presentState", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presentZipCode">ZIP Code</Label>
            <Input 
              id="presentZipCode"
              value={formData.presentZipCode}
              onChange={(e) => handleInputChange("presentZipCode", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presentCountry">Country</Label>
            <Input 
              id="presentCountry"
              value={formData.presentCountry}
              onChange={(e) => handleInputChange("presentCountry", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
        </div>

        {/* Row 9 - Present Address continued */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="presentTimeAtResidence">Time at Residence (Years)</Label>
            <Input 
              id="presentTimeAtResidence"
              type="number"
              min="0"
              step="0.1"
              value={formData.presentTimeAtResidence}
              onChange={(e) => handleInputChange("presentTimeAtResidence", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presentOwnership">Ownership</Label>
            <Select
              value={formData.presentOwnership}
              onValueChange={(value) => handleInputChange("presentOwnership", value)}
              disabled={!isEditable || isSaving}
            >
              <SelectTrigger id="presentOwnership">
                <SelectValue placeholder="Select ownership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Own">Own</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Living with Relative">Living with Relative</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-gray-500 italic">
          * If residing at present address for less than two years, then the details of previous address must be added.
        </div>
        
        <h4 className="text-md font-medium mt-4">Previous Address Details</h4>
        
        {/* Row 10 - Previous Address */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 col-span-3">
            <Label htmlFor="previousAddressLine1">Address Line 1</Label>
            <Input 
              id="previousAddressLine1"
              value={formData.previousAddressLine1}
              onChange={(e) => handleInputChange("previousAddressLine1", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="previousAddressUnit">Unit #</Label>
            <Input 
              id="previousAddressUnit"
              value={formData.previousAddressUnit}
              onChange={(e) => handleInputChange("previousAddressUnit", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
        </div>

        {/* Row 11 - Previous Address continued */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="previousCity">City</Label>
            <Input 
              id="previousCity"
              value={formData.previousCity}
              onChange={(e) => handleInputChange("previousCity", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="previousState">State</Label>
            <Input 
              id="previousState"
              value={formData.previousState}
              onChange={(e) => handleInputChange("previousState", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="previousZipCode">ZIP Code</Label>
            <Input 
              id="previousZipCode"
              value={formData.previousZipCode}
              onChange={(e) => handleInputChange("previousZipCode", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="previousCountry">Country</Label>
            <Input 
              id="previousCountry"
              value={formData.previousCountry}
              onChange={(e) => handleInputChange("previousCountry", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
        </div>

        {/* Row 12 - Previous Address continued */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="previousTimeAtResidence">Time at Residence (Years)</Label>
            <Input 
              id="previousTimeAtResidence"
              type="number"
              min="0"
              step="0.1"
              value={formData.previousTimeAtResidence}
              onChange={(e) => handleInputChange("previousTimeAtResidence", e.target.value)}
              disabled={!isEditable || isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="previousOwnership">Ownership</Label>
            <Select
              value={formData.previousOwnership}
              onValueChange={(value) => handleInputChange("previousOwnership", value)}
              disabled={!isEditable || isSaving}
            >
              <SelectTrigger id="previousOwnership">
                <SelectValue placeholder="Select ownership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Own">Own</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Living with Relative">Living with Relative</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="previousRentAmount">Rent Amount</Label>
            <Input 
              id="previousRentAmount"
              value={formData.previousRentAmount}
              onChange={(e) => handleInputChange("previousRentAmount", e.target.value)}
              disabled={!isEditable || isSaving || formData.previousOwnership !== "Rent"}
              placeholder="$"
            />
          </div>
        </div>

        <h4 className="text-md font-medium mt-4">Mailing Address</h4>
        
        {/* Row 13 - Mailing Address */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 flex items-center col-span-4">
            <Switch
              id="mailingAddressSameAsPresent"
              checked={formData.mailingAddressSameAsPresent}
              onCheckedChange={(checked) => handleInputChange("mailingAddressSameAsPresent", checked)}
              disabled={!isEditable || isSaving}
            />
            <Label htmlFor="mailingAddressSameAsPresent" className="ml-2">Same as Present Address</Label>
          </div>
        </div>

        {/* Only show these fields if mailingAddressSameAsPresent is false */}
        {!formData.mailingAddressSameAsPresent && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 col-span-3">
              <Label htmlFor="mailingAddressLine1">Address Line 1</Label>
              <Input 
                id="mailingAddressLine1"
                value={formData.mailingAddressLine1}
                onChange={(e) => handleInputChange("mailingAddressLine1", e.target.value)}
                disabled={!isEditable || isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mailingAddressUnit">Unit #</Label>
              <Input 
                id="mailingAddressUnit"
                value={formData.mailingAddressUnit}
                onChange={(e) => handleInputChange("mailingAddressUnit", e.target.value)}
                disabled={!isEditable || isSaving}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={!isEditable || isSaving}
          className="bg-mortgage-purple hover:bg-mortgage-darkPurple text-white"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Information
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
