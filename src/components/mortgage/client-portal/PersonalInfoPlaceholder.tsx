
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const PersonalInfoPlaceholder = () => (
  <div className="space-y-8 max-w-3xl mx-auto bg-white p-6 rounded-lg shadow border">
    {/* Primary Information Section */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Primary Information</h3>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" placeholder="First Name" value="" disabled />
        </div>
        <div>
          <Label htmlFor="middleName">Middle Name</Label>
          <Input id="middleName" placeholder="Middle Name" value="" disabled />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" placeholder="Last Name" value="" disabled />
        </div>
        <div>
          <Label htmlFor="suffix">Suffix</Label>
          <Select value="" disabled>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="socialSecurityNumber">Social Security Number</Label>
          <Input id="socialSecurityNumber" placeholder="XXX-XX-XXXX" value="" disabled />
        </div>
        <div>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input id="dateOfBirth" type="date" placeholder="mm/dd/yyyy" value="" disabled />
        </div>
        <div>
          <Label htmlFor="maritalStatus">Marital Status</Label>
          <Select value="" disabled>
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
        <div>
          <Label htmlFor="numberOfDependents">No. of Dependents</Label>
          <Input id="numberOfDependents" type="number" placeholder="0" value="" disabled />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="ageOfDependents">Age of Dependents</Label>
          <Input id="ageOfDependents" placeholder="e.g., 10, 12, 15" value="" disabled />
        </div>
        <div className="flex items-center pt-8">
          <Switch id="joinedToBorrower" checked={false} disabled />
          <Label htmlFor="joinedToBorrower" className="ml-2">Joined to Borrower</Label>
        </div>
        <div>
          <Label htmlFor="taxFilingAddressSameAs">Tax Filing Address Same As</Label>
          <Input id="taxFilingAddressSameAs" value="" disabled />
        </div>
        <div>
          <Label htmlFor="presentAddressSameAs">Present Address Same As</Label>
          <Input id="presentAddressSameAs" value="" disabled />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="citizenship">Citizenship</Label>
          <Select value="U.S. Citizen" disabled>
            <SelectTrigger id="citizenship">
              <SelectValue placeholder="U.S. Citizen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="U.S. Citizen">U.S. Citizen</SelectItem>
              <SelectItem value="Permanent Resident Alien">Permanent Resident Alien</SelectItem>
              <SelectItem value="Non-Permanent Resident Alien">Non-Permanent Resident Alien</SelectItem>
              <SelectItem value="Foreign National">Foreign National</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center pt-8">
          <Switch id="isVeteran" checked={false} disabled />
          <Label htmlFor="isVeteran" className="ml-2">Veteran</Label>
        </div>
      </div>
    </div>

    {/* Contact Details Section */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Contact Details</h3>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="homePhoneNumber">Home Phone Number</Label>
          <Input id="homePhoneNumber" placeholder="(XXX) XXX-XXXX" value="" disabled />
        </div>
        <div>
          <Label htmlFor="cellPhoneNumber">Cell Phone Number</Label>
          <Input id="cellPhoneNumber" placeholder="(XXX) XXX-XXXX" value="" disabled />
        </div>
        <div>
          <Label htmlFor="workPhoneNumber">Work Phone Number</Label>
          <Input id="workPhoneNumber" placeholder="(XXX) XXX-XXXX" value="" disabled />
        </div>
        <div>
          <Label htmlFor="workPhoneExt">Ext.</Label>
          <Input id="workPhoneExt" value="" disabled />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-3">
          <Label htmlFor="emailAddress">Email Address</Label>
          <Input id="emailAddress" type="email" value="" disabled />
        </div>
        <div className="flex items-center pt-8">
          <Switch id="noEmail" checked={false} disabled />
          <Label htmlFor="noEmail" className="ml-2">No Email</Label>
        </div>
      </div>
    </div>

    {/* Address History Section */}
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Address History</h3>
      <Separator />
      <h4 className="text-md font-medium mt-4">Present Address</h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-3">
          <Label htmlFor="presentAddressLine1">Address Line 1</Label>
          <Input id="presentAddressLine1" value="" disabled />
        </div>
        <div>
          <Label htmlFor="presentAddressUnit">Unit #</Label>
          <Input id="presentAddressUnit" value="" disabled />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="presentCity">City</Label>
          <Input id="presentCity" value="" disabled />
        </div>
        <div>
          <Label htmlFor="presentState">State</Label>
          <Input id="presentState" value="" disabled />
        </div>
        <div>
          <Label htmlFor="presentZipCode">ZIP Code</Label>
          <Input id="presentZipCode" value="" disabled />
        </div>
        <div>
          <Label htmlFor="presentCountry">Country</Label>
          <Input id="presentCountry" value="USA" disabled />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="presentTimeAtResidence">Time at Residence (Years)</Label>
          <Input id="presentTimeAtResidence" type="number" value="1" disabled />
        </div>
        <div>
          <Label htmlFor="presentOwnership">Ownership</Label>
          <Select value="" disabled>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-3">
          <Label htmlFor="previousAddressLine1">Address Line 1</Label>
          <Input id="previousAddressLine1" value="" disabled />
        </div>
        <div>
          <Label htmlFor="previousAddressUnit">Unit #</Label>
          <Input id="previousAddressUnit" value="" disabled />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="previousCity">City</Label>
          <Input id="previousCity" value="" disabled />
        </div>
        <div>
          <Label htmlFor="previousState">State</Label>
          <Input id="previousState" value="" disabled />
        </div>
        <div>
          <Label htmlFor="previousZipCode">ZIP Code</Label>
          <Input id="previousZipCode" value="" disabled />
        </div>
        <div>
          <Label htmlFor="previousCountry">Country</Label>
          <Input id="previousCountry" value="USA" disabled />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="previousTimeAtResidence">Time at Residence (Years)</Label>
          <Input id="previousTimeAtResidence" type="number" value="" disabled />
        </div>
        <div>
          <Label htmlFor="previousOwnership">Ownership</Label>
          <Select value="" disabled>
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
        <div>
          <Label htmlFor="previousRentAmount">Rent Amount</Label>
          <Input id="previousRentAmount" placeholder="$" value="" disabled />
        </div>
      </div>
      <h4 className="text-md font-medium mt-4">Mailing Address</h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex items-center col-span-4">
          <Switch id="mailingAddressSameAsPresent" checked={true} disabled />
          <Label htmlFor="mailingAddressSameAsPresent" className="ml-2">Same as Present Address</Label>
        </div>
      </div>
      {/* When not same, optionally: */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-3">
          <Label htmlFor="mailingAddressLine1">Address Line 1</Label>
          <Input id="mailingAddressLine1" value="" disabled />
        </div>
        <div>
          <Label htmlFor="mailingAddressUnit">Unit #</Label>
          <Input id="mailingAddressUnit" value="" disabled />
        </div>
      </div> */}
    </div>
  </div>
);

export default PersonalInfoPlaceholder;
