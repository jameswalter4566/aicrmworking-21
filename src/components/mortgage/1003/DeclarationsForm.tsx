
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Save, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

interface DeclarationsFormProps {
  leadId: string;
  mortgageData: any;
  onSave: (sectionData: { section: string; data: any }) => Promise<void>;
  isEditable?: boolean;
}

export const DeclarationsForm: React.FC<DeclarationsFormProps> = ({
  leadId,
  mortgageData,
  onSave,
  isEditable = true,
}) => {
  const [isSaving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Borrower declarations
    borrower: {
      occupyAsPrimaryResidence: mortgageData?.declarations?.borrower?.occupyAsPrimaryResidence || "",
      ownershipInterestPast3Years: mortgageData?.declarations?.borrower?.ownershipInterestPast3Years || "",
      propertyType: mortgageData?.declarations?.borrower?.propertyType || "",
      propertyTitle: mortgageData?.declarations?.borrower?.propertyTitle || "",
      familyRelationshipWithSeller: mortgageData?.declarations?.borrower?.familyRelationshipWithSeller || "",
      borrowingMoneyForDownpayment: mortgageData?.declarations?.borrower?.borrowingMoneyForDownpayment || "",
      downpaymentBorrowAmount: mortgageData?.declarations?.borrower?.downpaymentBorrowAmount || "",
      pendingMortgageApplications: mortgageData?.declarations?.borrower?.pendingMortgageApplications || "",
      pendingCreditApplications: mortgageData?.declarations?.borrower?.pendingCreditApplications || "",
      propertySubjectToLien: mortgageData?.declarations?.borrower?.propertySubjectToLien || "",
      coBorrower: mortgageData?.declarations?.borrower?.coBorrower || "",
      outstandingJudgments: mortgageData?.declarations?.borrower?.outstandingJudgments || "",
      delinquentDebt: mortgageData?.declarations?.borrower?.delinquentDebt || "",
      partyToLawsuit: mortgageData?.declarations?.borrower?.partyToLawsuit || "",
      conveyedTitleInLieuOfForeclosure: mortgageData?.declarations?.borrower?.conveyedTitleInLieuOfForeclosure || "",
      preforeclosureSale: mortgageData?.declarations?.borrower?.preforeclosureSale || "",
      propertyForeclosed: mortgageData?.declarations?.borrower?.propertyForeclosed || "",
      bankruptcyPast7Years: mortgageData?.declarations?.borrower?.bankruptcyPast7Years || "",
      bankruptcyType: mortgageData?.declarations?.borrower?.bankruptcyType || "",
      firstTimeHomeBuyer: mortgageData?.declarations?.borrower?.firstTimeHomeBuyer || "",
      homebuyCounseling: mortgageData?.declarations?.borrower?.homebuyCounseling || "",
      foreclosureExplanation: mortgageData?.declarations?.borrower?.foreclosureExplanation || "",
      delinquencyExplanation: mortgageData?.declarations?.borrower?.delinquencyExplanation || "",
      bankruptcyExplanation: mortgageData?.declarations?.borrower?.bankruptcyExplanation || "",
    },
    // Co-borrower declarations (if applicable)
    coBorrower: {
      occupyAsPrimaryResidence: mortgageData?.declarations?.coBorrower?.occupyAsPrimaryResidence || "",
      ownershipInterestPast3Years: mortgageData?.declarations?.coBorrower?.ownershipInterestPast3Years || "",
      propertyType: mortgageData?.declarations?.coBorrower?.propertyType || "",
      propertyTitle: mortgageData?.declarations?.coBorrower?.propertyTitle || "",
      familyRelationshipWithSeller: mortgageData?.declarations?.coBorrower?.familyRelationshipWithSeller || "",
      borrowingMoneyForDownpayment: mortgageData?.declarations?.coBorrower?.borrowingMoneyForDownpayment || "",
      downpaymentBorrowAmount: mortgageData?.declarations?.coBorrower?.downpaymentBorrowAmount || "",
      pendingMortgageApplications: mortgageData?.declarations?.coBorrower?.pendingMortgageApplications || "",
      pendingCreditApplications: mortgageData?.declarations?.coBorrower?.pendingCreditApplications || "",
      propertySubjectToLien: mortgageData?.declarations?.coBorrower?.propertySubjectToLien || "",
      coBorrower: mortgageData?.declarations?.coBorrower?.coBorrower || "",
      outstandingJudgments: mortgageData?.declarations?.coBorrower?.outstandingJudgments || "",
      delinquentDebt: mortgageData?.declarations?.coBorrower?.delinquentDebt || "",
      partyToLawsuit: mortgageData?.declarations?.coBorrower?.partyToLawsuit || "",
      conveyedTitleInLieuOfForeclosure: mortgageData?.declarations?.coBorrower?.conveyedTitleInLieuOfForeclosure || "",
      preforeclosureSale: mortgageData?.declarations?.coBorrower?.preforeclosureSale || "",
      propertyForeclosed: mortgageData?.declarations?.coBorrower?.propertyForeclosed || "",
      bankruptcyPast7Years: mortgageData?.declarations?.coBorrower?.bankruptcyPast7Years || "",
      bankruptcyType: mortgageData?.declarations?.coBorrower?.bankruptcyType || "",
      firstTimeHomeBuyer: mortgageData?.declarations?.coBorrower?.firstTimeHomeBuyer || "",
      homebuyCounseling: mortgageData?.declarations?.coBorrower?.homebuyCounseling || "",
      foreclosureExplanation: mortgageData?.declarations?.coBorrower?.foreclosureExplanation || "",
      delinquencyExplanation: mortgageData?.declarations?.coBorrower?.delinquencyExplanation || "",
      bankruptcyExplanation: mortgageData?.declarations?.coBorrower?.bankruptcyExplanation || "",
    }
  });

  const handleInputChange = (borrowerType: 'borrower' | 'coBorrower', field: string, value: string) => {
    setFormData(prevData => ({
      ...prevData,
      [borrowerType]: {
        ...prevData[borrowerType],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!isEditable) return;
    
    setSaving(true);
    try {
      await onSave({
        section: "declarations",
        data: { declarations: formData }
      });
      toast.success("Declarations saved successfully");
    } catch (error) {
      console.error("Error saving declarations:", error);
      toast.error("Failed to save declarations");
    } finally {
      setSaving(false);
    }
  };

  // Radio option rendering helper
  const renderRadioOptions = (
    borrowerType: 'borrower' | 'coBorrower', 
    field: string, 
    currentValue: string, 
    disabled: boolean = false
  ) => (
    <RadioGroup
      value={currentValue}
      onValueChange={(value) => handleInputChange(borrowerType, field, value)}
      className="flex space-x-4"
      disabled={disabled || !isEditable || isSaving}
    >
      <div className="flex items-center space-x-1">
        <RadioGroupItem value="yes" id={`${borrowerType}-${field}-yes`} />
        <Label htmlFor={`${borrowerType}-${field}-yes`}>Yes</Label>
      </div>
      <div className="flex items-center space-x-1">
        <RadioGroupItem value="no" id={`${borrowerType}-${field}-no`} />
        <Label htmlFor={`${borrowerType}-${field}-no`}>No</Label>
      </div>
    </RadioGroup>
  );

  // Get borrower names from mortgage data or use placeholders
  const borrowerName = mortgageData?.borrower?.fullLegalName || "BORROWER";
  const coBorrowerName = mortgageData?.coBorrower?.fullLegalName || "CO-BORROWER";

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ClipboardCheck className="h-5 w-5 mr-2 text-blue-500" />
          Declarations
        </CardTitle>
        <CardDescription>
          Information required by the lender to evaluate the loan application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {/* Header for borrower columns */}
          <div className="grid grid-cols-2 gap-4 bg-gray-100 p-2 rounded-md">
            <div className="font-medium text-center">{borrowerName}</div>
            <div className="font-medium text-center">{coBorrowerName}</div>
          </div>
          
          {/* A. Will you occupy the property as your primary residence? */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              A. Will you occupy the property as your primary residence?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'occupyAsPrimaryResidence', formData.borrower.occupyAsPrimaryResidence)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'occupyAsPrimaryResidence', formData.coBorrower.occupyAsPrimaryResidence)}
              </div>
            </div>
          </div>

          <Separator />
          
          {/* B. Ownership interest in the past three years */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              If YES, have you had an ownership interest in another property in the last three years?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'ownershipInterestPast3Years', formData.borrower.ownershipInterestPast3Years)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'ownershipInterestPast3Years', formData.coBorrower.ownershipInterestPast3Years)}
              </div>
            </div>
          </div>
          
          {/* Property type owned */}
          <div className="grid grid-cols-1 gap-2 ml-6">
            <Label className="text-sm">
              (1) What type of property did you own:
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={formData.borrower.propertyType}
                onValueChange={(value) => handleInputChange('borrower', 'propertyType', value)}
                disabled={!isEditable || isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primaryResidence">Primary Residence</SelectItem>
                  <SelectItem value="secondHome">Second Home</SelectItem>
                  <SelectItem value="investmentProperty">Investment Property</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={formData.coBorrower.propertyType}
                onValueChange={(value) => handleInputChange('coBorrower', 'propertyType', value)}
                disabled={!isEditable || isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primaryResidence">Primary Residence</SelectItem>
                  <SelectItem value="secondHome">Second Home</SelectItem>
                  <SelectItem value="investmentProperty">Investment Property</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* How title was held */}
          <div className="grid grid-cols-1 gap-2 ml-6">
            <Label className="text-sm">
              (2) How did you hold title to the property:
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={formData.borrower.propertyTitle}
                onValueChange={(value) => handleInputChange('borrower', 'propertyTitle', value)}
                disabled={!isEditable || isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select title type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solelyOwned">Solely</SelectItem>
                  <SelectItem value="jointlyWithSpouse">Jointly with Spouse</SelectItem>
                  <SelectItem value="jointlyWithOther">Jointly with Other Person</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={formData.coBorrower.propertyTitle}
                onValueChange={(value) => handleInputChange('coBorrower', 'propertyTitle', value)}
                disabled={!isEditable || isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select title type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solelyOwned">Solely</SelectItem>
                  <SelectItem value="jointlyWithSpouse">Jointly with Spouse</SelectItem>
                  <SelectItem value="jointlyWithOther">Jointly with Other Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          
          {/* B. Family relationship with seller */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              B. If this is a Purchase Transaction: Do you have a family relationship or business affiliation with the seller of the property?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'familyRelationshipWithSeller', formData.borrower.familyRelationshipWithSeller)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'familyRelationshipWithSeller', formData.coBorrower.familyRelationshipWithSeller)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* C. Borrowing money for downpayment */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              C. Are you borrowing any money for this real estate transaction (e.g., money for your closing costs or down payment) or obtaining any money from another party, such as the seller or realtor, that you have not disclosed on this loan application?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'borrowingMoneyForDownpayment', formData.borrower.borrowingMoneyForDownpayment)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'borrowingMoneyForDownpayment', formData.coBorrower.borrowingMoneyForDownpayment)}
              </div>
            </div>
          </div>
          
          {/* How much money is borrowed */}
          <div className="grid grid-cols-1 gap-2 ml-6">
            <Label className="text-sm">
              If YES, what is the amount of this money?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <span className="mr-2">$</span>
                <Input
                  type="number"
                  value={formData.borrower.downpaymentBorrowAmount}
                  onChange={(e) => handleInputChange('borrower', 'downpaymentBorrowAmount', e.target.value)}
                  placeholder="0.00"
                  disabled={formData.borrower.borrowingMoneyForDownpayment !== 'yes' || !isEditable || isSaving}
                />
              </div>
              <div className="flex items-center">
                <span className="mr-2">$</span>
                <Input
                  type="number"
                  value={formData.coBorrower.downpaymentBorrowAmount}
                  onChange={(e) => handleInputChange('coBorrower', 'downpaymentBorrowAmount', e.target.value)}
                  placeholder="0.00"
                  disabled={formData.coBorrower.borrowingMoneyForDownpayment !== 'yes' || !isEditable || isSaving}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* D.1 Pending mortgage applications */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              D.1 Have you or will you be applying for a mortgage loan on another property (not the property securing this loan) on or before closing this transaction that is not disclosed on this loan application?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'pendingMortgageApplications', formData.borrower.pendingMortgageApplications)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'pendingMortgageApplications', formData.coBorrower.pendingMortgageApplications)}
              </div>
            </div>
          </div>
          
          {/* D.2 Pending credit applications */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              D.2 Have you or will you be applying for any new credit (e.g., installment loan, credit card, etc.) on or before closing this loan that is not disclosed on this application?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'pendingCreditApplications', formData.borrower.pendingCreditApplications)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'pendingCreditApplications', formData.coBorrower.pendingCreditApplications)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* E. Property subject to lien */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              E. Will this property be subject to a lien that could take priority over the first mortgage lien, such as a clean energy lien paid through your property taxes (e.g., the Property Assessed Clean Energy Program)?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'propertySubjectToLien', formData.borrower.propertySubjectToLien)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'propertySubjectToLien', formData.coBorrower.propertySubjectToLien)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* F. Co-signer or guarantor */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              F. Are you a co-signer or guarantor on any debt or loan that is not disclosed on this application?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'coBorrower', formData.borrower.coBorrower)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'coBorrower', formData.coBorrower.coBorrower)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* G. Outstanding judgments */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              G. Are there any outstanding judgments against you?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'outstandingJudgments', formData.borrower.outstandingJudgments)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'outstandingJudgments', formData.coBorrower.outstandingJudgments)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* H. Delinquent debt */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              H. Are you currently delinquent or in default on a Federal debt?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'delinquentDebt', formData.borrower.delinquentDebt)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'delinquentDebt', formData.coBorrower.delinquentDebt)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* I. Party to lawsuit */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              I. Are you a party to a lawsuit in which you potentially have any personal financial liability?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'partyToLawsuit', formData.borrower.partyToLawsuit)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'partyToLawsuit', formData.coBorrower.partyToLawsuit)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* J. Conveyed title in lieu of foreclosure */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              J. Have you conveyed title to any property in lieu of foreclosure in the past 7 years?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'conveyedTitleInLieuOfForeclosure', formData.borrower.conveyedTitleInLieuOfForeclosure)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'conveyedTitleInLieuOfForeclosure', formData.coBorrower.conveyedTitleInLieuOfForeclosure)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* K. Preforeclosure sale */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              K. Within the past 7 years, have you completed a pre-foreclosure sale or short sale, whereby the property was sold to a third party and the Lender agreed to accept less than the outstanding mortgage balance due?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'preforeclosureSale', formData.borrower.preforeclosureSale)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'preforeclosureSale', formData.coBorrower.preforeclosureSale)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* L. Property foreclosed */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              L. Have you had property foreclosed upon in the last 7 years?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'propertyForeclosed', formData.borrower.propertyForeclosed)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'propertyForeclosed', formData.coBorrower.propertyForeclosed)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* M. Bankruptcy */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              M. Have you declared bankruptcy within the past 7 years?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'bankruptcyPast7Years', formData.borrower.bankruptcyPast7Years)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'bankruptcyPast7Years', formData.coBorrower.bankruptcyPast7Years)}
              </div>
            </div>
          </div>
          
          {/* Bankruptcy type */}
          <div className="grid grid-cols-1 gap-2 ml-6">
            <Label className="text-sm">
              If YES, identify the type(s) of bankruptcy:
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex space-x-4">
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="chapter7" id="borrower-chapter7" checked={formData.borrower.bankruptcyType === 'chapter7'} 
                    onClick={() => handleInputChange('borrower', 'bankruptcyType', 'chapter7')} 
                    disabled={formData.borrower.bankruptcyPast7Years !== 'yes' || !isEditable || isSaving} />
                  <Label htmlFor="borrower-chapter7">7</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="chapter11" id="borrower-chapter11" checked={formData.borrower.bankruptcyType === 'chapter11'} 
                    onClick={() => handleInputChange('borrower', 'bankruptcyType', 'chapter11')} 
                    disabled={formData.borrower.bankruptcyPast7Years !== 'yes' || !isEditable || isSaving} />
                  <Label htmlFor="borrower-chapter11">11</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="chapter12" id="borrower-chapter12" checked={formData.borrower.bankruptcyType === 'chapter12'} 
                    onClick={() => handleInputChange('borrower', 'bankruptcyType', 'chapter12')} 
                    disabled={formData.borrower.bankruptcyPast7Years !== 'yes' || !isEditable || isSaving} />
                  <Label htmlFor="borrower-chapter12">12</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="chapter13" id="borrower-chapter13" checked={formData.borrower.bankruptcyType === 'chapter13'} 
                    onClick={() => handleInputChange('borrower', 'bankruptcyType', 'chapter13')} 
                    disabled={formData.borrower.bankruptcyPast7Years !== 'yes' || !isEditable || isSaving} />
                  <Label htmlFor="borrower-chapter13">13</Label>
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="chapter7" id="coBorrower-chapter7" checked={formData.coBorrower.bankruptcyType === 'chapter7'} 
                    onClick={() => handleInputChange('coBorrower', 'bankruptcyType', 'chapter7')} 
                    disabled={formData.coBorrower.bankruptcyPast7Years !== 'yes' || !isEditable || isSaving} />
                  <Label htmlFor="coBorrower-chapter7">7</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="chapter11" id="coBorrower-chapter11" checked={formData.coBorrower.bankruptcyType === 'chapter11'} 
                    onClick={() => handleInputChange('coBorrower', 'bankruptcyType', 'chapter11')} 
                    disabled={formData.coBorrower.bankruptcyPast7Years !== 'yes' || !isEditable || isSaving} />
                  <Label htmlFor="coBorrower-chapter11">11</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="chapter12" id="coBorrower-chapter12" checked={formData.coBorrower.bankruptcyType === 'chapter12'} 
                    onClick={() => handleInputChange('coBorrower', 'bankruptcyType', 'chapter12')} 
                    disabled={formData.coBorrower.bankruptcyPast7Years !== 'yes' || !isEditable || isSaving} />
                  <Label htmlFor="coBorrower-chapter12">12</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="chapter13" id="coBorrower-chapter13" checked={formData.coBorrower.bankruptcyType === 'chapter13'} 
                    onClick={() => handleInputChange('coBorrower', 'bankruptcyType', 'chapter13')} 
                    disabled={formData.coBorrower.bankruptcyPast7Years !== 'yes' || !isEditable || isSaving} />
                  <Label htmlFor="coBorrower-chapter13">13</Label>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* N. First time homebuyer */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              N. Are any of the occupant borrowers first time homebuyers?
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'firstTimeHomeBuyer', formData.borrower.firstTimeHomeBuyer)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'firstTimeHomeBuyer', formData.coBorrower.firstTimeHomeBuyer)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* O. Homebuyer counseling */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">
              O. HUD Approved Counseling
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderRadioOptions('borrower', 'homebuyCounseling', formData.borrower.homebuyCounseling)}
              </div>
              <div>
                {renderRadioOptions('coBorrower', 'homebuyCounseling', formData.coBorrower.homebuyCounseling)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* DU Explanations */}
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">DU Explanation: Foreclosure</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Select
                  value={formData.borrower.foreclosureExplanation}
                  onValueChange={(value) => handleInputChange('borrower', 'foreclosureExplanation', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="(none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(none)</SelectItem>
                    <SelectItem value="illness">Illness</SelectItem>
                    <SelectItem value="jobLoss">Job Loss</SelectItem>
                    <SelectItem value="reducedIncome">Reduced Income</SelectItem>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {renderRadioOptions('borrower', 'foreclosureExplanation', formData.borrower.foreclosureExplanation)}
              </div>
              <div className="space-y-2">
                <Select
                  value={formData.coBorrower.foreclosureExplanation}
                  onValueChange={(value) => handleInputChange('coBorrower', 'foreclosureExplanation', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="(none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(none)</SelectItem>
                    <SelectItem value="illness">Illness</SelectItem>
                    <SelectItem value="jobLoss">Job Loss</SelectItem>
                    <SelectItem value="reducedIncome">Reduced Income</SelectItem>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {renderRadioOptions('coBorrower', 'foreclosureExplanation', formData.coBorrower.foreclosureExplanation)}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">DU Explanation: Delinquency</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Select
                  value={formData.borrower.delinquencyExplanation}
                  onValueChange={(value) => handleInputChange('borrower', 'delinquencyExplanation', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="(none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(none)</SelectItem>
                    <SelectItem value="illness">Illness</SelectItem>
                    <SelectItem value="jobLoss">Job Loss</SelectItem>
                    <SelectItem value="reducedIncome">Reduced Income</SelectItem>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {renderRadioOptions('borrower', 'delinquencyExplanation', formData.borrower.delinquencyExplanation)}
              </div>
              <div className="space-y-2">
                <Select
                  value={formData.coBorrower.delinquencyExplanation}
                  onValueChange={(value) => handleInputChange('coBorrower', 'delinquencyExplanation', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="(none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(none)</SelectItem>
                    <SelectItem value="illness">Illness</SelectItem>
                    <SelectItem value="jobLoss">Job Loss</SelectItem>
                    <SelectItem value="reducedIncome">Reduced Income</SelectItem>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {renderRadioOptions('coBorrower', 'delinquencyExplanation', formData.coBorrower.delinquencyExplanation)}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Label className="font-medium">DU Explanation: Bankruptcy</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Select
                  value={formData.borrower.bankruptcyExplanation}
                  onValueChange={(value) => handleInputChange('borrower', 'bankruptcyExplanation', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="(none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(none)</SelectItem>
                    <SelectItem value="illness">Illness</SelectItem>
                    <SelectItem value="jobLoss">Job Loss</SelectItem>
                    <SelectItem value="reducedIncome">Reduced Income</SelectItem>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="medicalBills">Medical Bills</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {renderRadioOptions('borrower', 'bankruptcyExplanation', formData.borrower.bankruptcyExplanation)}
              </div>
              <div className="space-y-2">
                <Select
                  value={formData.coBorrower.bankruptcyExplanation}
                  onValueChange={(value) => handleInputChange('coBorrower', 'bankruptcyExplanation', value)}
                  disabled={!isEditable || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="(none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">(none)</SelectItem>
                    <SelectItem value="illness">Illness</SelectItem>
                    <SelectItem value="jobLoss">Job Loss</SelectItem>
                    <SelectItem value="reducedIncome">Reduced Income</SelectItem>
                    <SelectItem value="divorce">Divorce</SelectItem>
                    <SelectItem value="medicalBills">Medical Bills</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {renderRadioOptions('coBorrower', 'bankruptcyExplanation', formData.coBorrower.bankruptcyExplanation)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSave}
            disabled={!isEditable || isSaving}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Declarations
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
