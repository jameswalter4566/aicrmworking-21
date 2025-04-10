import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PersonalInfoFormProps {
  initialData?: any;
  onSave: (data: any) => void;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ initialData, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || "",
    middleName: initialData?.middleName || "",
    lastName: initialData?.lastName || "",
    suffix: initialData?.suffix || "",
    ssn: initialData?.ssn || "",
    dob: initialData?.dob || "",
    maritalStatus: initialData?.maritalStatus || "",
    dependentsCount: initialData?.dependentsCount || "0",
    dependentsAges: initialData?.dependentsAges || "",
    citizenship: initialData?.citizenship || "U.S. Citizen",
    veteran: initialData?.veteran || false,
    homePhone: initialData?.homePhone || "",
    cellPhone: initialData?.cellPhone || "",
    workPhone: initialData?.workPhone || "",
    workPhoneExt: initialData?.workPhoneExt || "",
    email: initialData?.email || "",
    hasEmail: initialData?.email ? true : false,
    addressLine1: initialData?.addressLine1 || "",
    addressUnit: initialData?.addressUnit || "",
    addressCity: initialData?.addressCity || "",
    addressState: initialData?.addressState || "",
    addressZip: initialData?.addressZip || "",
    addressCountry: initialData?.addressCountry || "USA",
    timeAtResidence: initialData?.timeAtResidence || "1",
    ownership: initialData?.ownership || "Own",
    prevAddressLine1: initialData?.prevAddressLine1 || "",
    prevAddressUnit: initialData?.prevAddressUnit || "",
    prevAddressCity: initialData?.prevAddressCity || "",
    prevAddressState: initialData?.prevAddressState || "",
    prevAddressZip: initialData?.prevAddressZip || "",
    prevAddressCountry: initialData?.prevAddressCountry || "USA",
    prevTimeAtResidence: initialData?.prevTimeAtResidence || "",
    prevOwnership: initialData?.prevOwnership || "Rent",
    prevRentAmount: initialData?.prevRentAmount || "",
    mailingSameAsPresent: initialData?.mailingSameAsPresent !== false,
    mailingAddressLine1: initialData?.mailingAddressLine1 || "",
    mailingAddressUnit: initialData?.mailingAddressUnit || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Personal Information</h2>

      {/* Primary Information Section */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-medium mb-4 text-mortgage-darkPurple">Primary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="middleName">Middle Name</Label>
            <Input
              id="middleName"
              name="middleName"
              value={formData.middleName}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="suffix">Suffix</Label>
            <Select 
              name="suffix"
              value={formData.suffix}
              onValueChange={(value) => handleSelectChange("suffix", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                <SelectItem value="Jr.">Jr.</SelectItem>
                <SelectItem value="Sr.">Sr.</SelectItem>
                <SelectItem value="II">II</SelectItem>
                <SelectItem value="III">III</SelectItem>
                <SelectItem value="IV">IV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="ssn">Social Security Number</Label>
            <Input
              id="ssn"
              name="ssn"
              value={formData.ssn}
              onChange={handleInputChange}
              placeholder="XXX-XX-XXXX"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="maritalStatus">Marital Status</Label>
            <Select 
              name="maritalStatus"
              value={formData.maritalStatus}
              onValueChange={(value) => handleSelectChange("maritalStatus", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Separated">Separated</SelectItem>
                <SelectItem value="Unmarried">Unmarried</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="dependentsCount">No. of Dependents</Label>
            <Input
              id="dependentsCount"
              name="dependentsCount"
              type="number"
              min="0"
              value={formData.dependentsCount}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="dependentsAges">Age of Dependents</Label>
            <Input
              id="dependentsAges"
              name="dependentsAges"
              value={formData.dependentsAges}
              onChange={handleInputChange}
              placeholder="e.g. 10, 12, 15"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="citizenship">Citizenship</Label>
            <Select 
              name="citizenship"
              value={formData.citizenship}
              onValueChange={(value) => handleSelectChange("citizenship", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="U.S. Citizen">U.S. Citizen</SelectItem>
                <SelectItem value="Permanent Resident Alien">Permanent Resident Alien</SelectItem>
                <SelectItem value="Non-Permanent Resident Alien">Non-Permanent Resident Alien</SelectItem>
                <SelectItem value="Foreign National">Foreign National</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end mb-2">
            <label htmlFor="veteran" className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                id="veteran"
                name="veteran"
                checked={formData.veteran}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-mortgage-purple focus:ring-mortgage-purple"
              />
              <span>Veteran?</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Contact Details Section */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-medium mb-4 text-mortgage-darkPurple">Contact Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="homePhone">Home Phone Number</Label>
            <Input
              id="homePhone"
              name="homePhone"
              value={formData.homePhone}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="cellPhone">Cell Phone Number</Label>
            <Input
              id="cellPhone"
              name="cellPhone"
              value={formData.cellPhone}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="workPhone">Work Phone Number</Label>
            <Input
              id="workPhone"
              name="workPhone"
              value={formData.workPhone}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="workPhoneExt">Ext.</Label>
            <Input
              id="workPhoneExt"
              name="workPhoneExt"
              value={formData.workPhoneExt}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!formData.hasEmail}
              className="mt-1"
            />
          </div>
          
          <div className="flex items-end mb-2">
            <label htmlFor="hasEmail" className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                id="hasEmail"
                name="hasEmail"
                checked={!formData.hasEmail}
                onChange={(e) => setFormData({...formData, hasEmail: !e.target.checked})}
                className="rounded border-gray-300 text-mortgage-purple focus:ring-mortgage-purple"
              />
              <span>No Email</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Present Address Section */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-medium mb-4 text-mortgage-darkPurple">Present Address</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="addressUnit">Unit #</Label>
            <Input
              id="addressUnit"
              name="addressUnit"
              value={formData.addressUnit}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="addressCity">City</Label>
            <Input
              id="addressCity"
              name="addressCity"
              value={formData.addressCity}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="addressState">State</Label>
            <Input
              id="addressState"
              name="addressState"
              value={formData.addressState}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="addressZip">ZIP Code</Label>
            <Input
              id="addressZip"
              name="addressZip"
              value={formData.addressZip}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="addressCountry">Country</Label>
            <Input
              id="addressCountry"
              name="addressCountry"
              value={formData.addressCountry}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="timeAtResidence">Time at Residence (Years)</Label>
            <Input
              id="timeAtResidence"
              name="timeAtResidence"
              type="number"
              min="0"
              value={formData.timeAtResidence}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="ownership">Ownership</Label>
            <Select 
              name="ownership"
              value={formData.ownership}
              onValueChange={(value) => handleSelectChange("ownership", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Own">Own</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Living rent free">Living rent free</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 italic mt-2">
          * If residing at present address for less than two years, then the details of previous address must be added.
        </p>
      </Card>

      {/* Previous Address Section */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-medium mb-4 text-mortgage-darkPurple">Previous Address Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <Label htmlFor="prevAddressLine1">Address Line 1</Label>
            <Input
              id="prevAddressLine1"
              name="prevAddressLine1"
              value={formData.prevAddressLine1}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="prevAddressUnit">Unit #</Label>
            <Input
              id="prevAddressUnit"
              name="prevAddressUnit"
              value={formData.prevAddressUnit}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="prevAddressCity">City</Label>
            <Input
              id="prevAddressCity"
              name="prevAddressCity"
              value={formData.prevAddressCity}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="prevAddressState">State</Label>
            <Input
              id="prevAddressState"
              name="prevAddressState"
              value={formData.prevAddressState}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="prevAddressZip">ZIP Code</Label>
            <Input
              id="prevAddressZip"
              name="prevAddressZip"
              value={formData.prevAddressZip}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="prevAddressCountry">Country</Label>
            <Input
              id="prevAddressCountry"
              name="prevAddressCountry"
              value={formData.prevAddressCountry}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="prevTimeAtResidence">Time at Residence (Years)</Label>
            <Input
              id="prevTimeAtResidence"
              name="prevTimeAtResidence"
              type="number"
              min="0"
              value={formData.prevTimeAtResidence}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="prevOwnership">Ownership</Label>
            <Select 
              name="prevOwnership"
              value={formData.prevOwnership}
              onValueChange={(value) => handleSelectChange("prevOwnership", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Own">Own</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Living rent free">Living rent free</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="prevRentAmount">Rent Amount</Label>
            <Input
              id="prevRentAmount"
              name="prevRentAmount"
              type="number"
              min="0"
              value={formData.prevRentAmount}
              onChange={handleInputChange}
              className="mt-1"
              disabled={formData.prevOwnership !== 'Rent'}
            />
          </div>
        </div>
      </Card>

      {/* Mailing Address Section */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-medium mb-4 text-mortgage-darkPurple">Mailing Address</h3>
        
        <div className="mb-4">
          <label htmlFor="mailingSameAsPresent" className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              id="mailingSameAsPresent"
              name="mailingSameAsPresent"
              checked={formData.mailingSameAsPresent}
              onChange={handleInputChange}
              className="rounded border-gray-300 text-mortgage-purple focus:ring-mortgage-purple"
            />
            <span>Same as Present Address</span>
          </label>
        </div>
        
        {!formData.mailingSameAsPresent && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mailingAddressLine1">Address Line 1</Label>
              <Input
                id="mailingAddressLine1"
                name="mailingAddressLine1"
                value={formData.mailingAddressLine1}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="mailingAddressUnit">Unit #</Label>
              <Input
                id="mailingAddressUnit"
                name="mailingAddressUnit"
                value={formData.mailingAddressUnit}
                onChange={handleInputChange}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-end mt-8">
        <Button type="submit" className="bg-mortgage-purple hover:bg-mortgage-darkPurple">
          Save Information
        </Button>
      </div>
    </form>
  );
};

export default PersonalInfoForm;
