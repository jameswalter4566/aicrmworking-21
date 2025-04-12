
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Briefcase, Building, MapPin, Phone, Mail, Calendar, DollarSign } from "lucide-react";

interface EmploymentIncomeFormProps {
  leadId: string;
  mortgageData?: any;
  onSave: (data: any) => void;
  isEditable?: boolean;
}

interface IncomeEntry {
  id: string;
  type: string;
  employerName: string;
  addressLine1: string;
  unit: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  employerPhone: string;
  verificationPhone: string;
  verificationEmail: string;
  position: string;
  startDate: string;
  endDate: string;
  isFamilyOrRelatedToTransaction: boolean;
  monthlyIncome: {
    base: number;
    overtime: number;
    bonuses: number;
    commission: number;
    tipIncome: number;
    seasonalIncome: number;
    otherW2Income: number;
  }
}

export const EmploymentIncomeForm: React.FC<EmploymentIncomeFormProps> = ({ 
  leadId, 
  mortgageData, 
  onSave,
  isEditable = true 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>(
    mortgageData?.borrower?.incomeEntries || []
  );
  
  const [currentEntry, setCurrentEntry] = useState<IncomeEntry>({
    id: Date.now().toString(),
    type: "primaryCurrentEmployment",
    employerName: "",
    addressLine1: "",
    unit: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    employerPhone: "",
    verificationPhone: "",
    verificationEmail: "",
    position: "",
    startDate: "",
    endDate: "",
    isFamilyOrRelatedToTransaction: false,
    monthlyIncome: {
      base: 0,
      overtime: 0,
      bonuses: 0,
      commission: 0,
      tipIncome: 0,
      seasonalIncome: 0,
      otherW2Income: 0
    }
  });

  const handleAddNewIncome = () => {
    setShowForm(true);
  };
  
  const handleSaveIncome = () => {
    const updatedEntries = [...incomeEntries, currentEntry];
    setIncomeEntries(updatedEntries);
    
    // Reset form
    setCurrentEntry({
      id: Date.now().toString(),
      type: "primaryCurrentEmployment",
      employerName: "",
      addressLine1: "",
      unit: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      employerPhone: "",
      verificationPhone: "",
      verificationEmail: "",
      position: "",
      startDate: "",
      endDate: "",
      isFamilyOrRelatedToTransaction: false,
      monthlyIncome: {
        base: 0,
        overtime: 0,
        bonuses: 0,
        commission: 0,
        tipIncome: 0,
        seasonalIncome: 0,
        otherW2Income: 0
      }
    });
    
    setShowForm(false);
    
    // Call the parent save handler
    onSave({
      section: 'employment',
      data: {
        borrower: {
          ...mortgageData?.borrower,
          incomeEntries: updatedEntries
        }
      }
    });
  };
  
  const handleCancelForm = () => {
    setShowForm(false);
  };
  
  const handleInputChange = (field: string, value: string | boolean | number) => {
    if (field.includes('.')) {
      // Handle nested fields (like monthlyIncome.base)
      const [parentField, childField] = field.split('.');
      setCurrentEntry(prev => ({
        ...prev,
        [parentField]: {
          ...prev[parentField as keyof typeof prev] as Record<string, any>,
          [childField]: value
        }
      }));
    } else {
      setCurrentEntry(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Employment & Income Information</h3>
        {!showForm && (
          <Button 
            onClick={handleAddNewIncome} 
            disabled={!isEditable || showForm}
            className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Income
          </Button>
        )}
      </div>

      {incomeEntries.length === 0 && !showForm && (
        <div className="text-center py-8 border border-dashed rounded-md">
          <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No employment or income information has been added yet.</p>
          <Button 
            variant="outline" 
            onClick={handleAddNewIncome} 
            className="mt-2"
            disabled={!isEditable}
          >
            Add Employment
          </Button>
        </div>
      )}

      {incomeEntries.map((entry, index) => (
        <Card key={entry.id} className="bg-gray-50">
          <CardContent className="pt-4">
            <div className="font-medium mb-4 flex items-center">
              <Briefcase className="mr-2 h-4 w-4 text-mortgage-purple" />
              {entry.type === "primaryCurrentEmployment" ? "Primary Current Employment" : entry.type}
            </div>
            <div className="text-sm">
              <p><strong>Employer:</strong> {entry.employerName}</p>
              <p><strong>Position:</strong> {entry.position}</p>
              <p><strong>Monthly Base Income:</strong> ${entry.monthlyIncome.base.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      {showForm && (
        <div className="border rounded-lg p-4 bg-white">
          <h4 className="text-lg font-medium mb-4 border-b pb-2">Add Employment & Income</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <Label htmlFor="incomeType">Income Type</Label>
              <Select 
                value={currentEntry.type}
                onValueChange={(value) => handleInputChange('type', value)}
                disabled={!isEditable}
              >
                <SelectTrigger id="incomeType">
                  <SelectValue placeholder="Select Income Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primaryCurrentEmployment">Primary Current Employment</SelectItem>
                  <SelectItem value="secondaryEmployment">Secondary Employment</SelectItem>
                  <SelectItem value="selfEmployment">Self-Employment</SelectItem>
                  <SelectItem value="retirement">Retirement Income</SelectItem>
                  <SelectItem value="other">Other Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="employerName">
                <Building className="inline h-4 w-4 mr-1 opacity-70" />
                Employer Name
              </Label>
              <Input 
                id="employerName"
                value={currentEntry.employerName}
                onChange={(e) => handleInputChange('employerName', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="addressLine1">
                <MapPin className="inline h-4 w-4 mr-1 opacity-70" />
                Address Line 1
              </Label>
              <Input 
                id="addressLine1"
                value={currentEntry.addressLine1}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="unit">Unit #</Label>
              <Input 
                id="unit"
                value={currentEntry.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                disabled={!isEditable}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <Label htmlFor="city">City</Label>
              <Input 
                id="city"
                value={currentEntry.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="state">State</Label>
              <Input 
                id="state"
                value={currentEntry.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input 
                id="zipCode"
                value={currentEntry.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="country">Country</Label>
              <Input 
                id="country"
                value={currentEntry.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                disabled={!isEditable}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <Label htmlFor="employerPhone">
                <Phone className="inline h-4 w-4 mr-1 opacity-70" />
                Employer Phone
              </Label>
              <Input 
                id="employerPhone"
                value={currentEntry.employerPhone}
                onChange={(e) => handleInputChange('employerPhone', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="verificationPhone">
                <Phone className="inline h-4 w-4 mr-1 opacity-70" />
                Verification Phone
              </Label>
              <Input 
                id="verificationPhone"
                value={currentEntry.verificationPhone}
                onChange={(e) => handleInputChange('verificationPhone', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="verificationEmail">
                <Mail className="inline h-4 w-4 mr-1 opacity-70" />
                Verification Email
              </Label>
              <Input 
                id="verificationEmail"
                value={currentEntry.verificationEmail}
                onChange={(e) => handleInputChange('verificationEmail', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="position">Position</Label>
              <Input 
                id="position"
                value={currentEntry.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                disabled={!isEditable}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <Label htmlFor="startDate">
                <Calendar className="inline h-4 w-4 mr-1 opacity-70" />
                Start Date
              </Label>
              <Input 
                id="startDate"
                type="date"
                value={currentEntry.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="endDate">
                <Calendar className="inline h-4 w-4 mr-1 opacity-70" />
                End Date
              </Label>
              <Input 
                id="endDate"
                type="date"
                value={currentEntry.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                disabled={!isEditable}
                placeholder="Leave blank if current"
              />
            </div>
            
            <div className="col-span-2 flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isFamilyRelated" 
                  checked={currentEntry.isFamilyOrRelatedToTransaction}
                  onCheckedChange={(checked) => 
                    handleInputChange('isFamilyOrRelatedToTransaction', checked === true)
                  }
                  disabled={!isEditable}
                />
                <label 
                  htmlFor="isFamilyRelated"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I am employed by a family member, property seller, real estate agent, or other party to the transaction
                </label>
              </div>
            </div>
          </div>
          
          <h5 className="font-medium mb-4 mt-8">Monthly Income Details</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <Label htmlFor="baseIncome">
                <DollarSign className="inline h-4 w-4 mr-1 opacity-70" />
                Base Income
              </Label>
              <Input 
                id="baseIncome"
                type="number"
                value={currentEntry.monthlyIncome.base.toString()}
                onChange={(e) => handleInputChange('monthlyIncome.base', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="overtime">Overtime</Label>
              <Input 
                id="overtime"
                type="number"
                value={currentEntry.monthlyIncome.overtime.toString()}
                onChange={(e) => handleInputChange('monthlyIncome.overtime', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="bonuses">Bonuses</Label>
              <Input 
                id="bonuses"
                type="number"
                value={currentEntry.monthlyIncome.bonuses.toString()}
                onChange={(e) => handleInputChange('monthlyIncome.bonuses', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="commission">Commission</Label>
              <Input 
                id="commission"
                type="number"
                value={currentEntry.monthlyIncome.commission.toString()}
                onChange={(e) => handleInputChange('monthlyIncome.commission', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="col-span-1">
              <Label htmlFor="tipIncome">Tip Income</Label>
              <Input 
                id="tipIncome"
                type="number"
                value={currentEntry.monthlyIncome.tipIncome.toString()}
                onChange={(e) => handleInputChange('monthlyIncome.tipIncome', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="seasonalIncome">Seasonal Income</Label>
              <Input 
                id="seasonalIncome"
                type="number"
                value={currentEntry.monthlyIncome.seasonalIncome.toString()}
                onChange={(e) => handleInputChange('monthlyIncome.seasonalIncome', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="otherW2Income">Other W2 Income</Label>
              <Input 
                id="otherW2Income"
                type="number"
                value={currentEntry.monthlyIncome.otherW2Income.toString()}
                onChange={(e) => handleInputChange('monthlyIncome.otherW2Income', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancelForm} disabled={!isEditable}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveIncome} 
              disabled={!isEditable || !currentEntry.employerName}
              className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
            >
              Save Income Entry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
