
import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

const PROPERTY_TYPES = [
  "Single Family", "Condo", "2-4 Units", "Multi-Family", "Manufactured", "Townhome", "Other"
];

const PROPERTY_STATUSES = [
  "Retained", "Sold", "Pending Sale", "Listed", "Other"
];

const OCCUPANCY_TYPES = [
  "Primary Residence", "Second Home", "Investment", "Vacant", "Other"
];

// Simple tab visuals (not functional, just styled placeholders)
function RealEstateSectionTabs() {
  return (
    <div className="flex gap-2 mb-4">
      <button
        type="button"
        className="px-4 py-2 font-medium text-mortgage-darkPurple bg-mortgage-lightPurple rounded-t-lg border-b-2 border-mortgage-purple"
        disabled
      >
        REAL ESTATE DETAILS
      </button>
      <button
        type="button"
        className="px-4 py-2 font-medium text-gray-400 bg-gray-100 rounded-t-lg border-b-2 border-gray-200 cursor-not-allowed"
        disabled
      >
        RENTAL INCOME & PROPERTY EXPENSES
      </button>
    </div>
  );
}

const RealEstateFormPlaceholder = () => (
  <div className="my-4 p-6 rounded-lg border bg-white flex flex-col space-y-6">
    <RealEstateSectionTabs />

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left column */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input type="checkbox" className="h-5 w-5 rounded border-mortgage-purple text-mortgage-purple" disabled />
          <Label className="text-sm text-mortgage-darkPurple">Subject Property</Label>
        </div>
      </div>
      {/* Center column */}
      <div className="space-y-2 md:col-span-1">
        <Label className="text-sm text-mortgage-darkPurple mb-1 block">Real Estate Owners:</Label>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <input type="checkbox" className="h-5 w-5 rounded border-mortgage-purple text-mortgage-purple" disabled />
            <span className="text-sm">Rene Pastor</span>
          </div>
          <div className="flex gap-2 items-center">
            <input type="checkbox" className="h-5 w-5 rounded border-mortgage-purple text-mortgage-purple" disabled />
            <span className="text-sm">Iohana Tapia Garcia</span>
          </div>
        </div>
      </div>
      {/* Right column */}
      <div className="space-y-2 md:col-span-1">
        <Label className="text-sm text-mortgage-darkPurple mb-1 block">Borrower(s) Using This As Primary Address:</Label>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <input type="checkbox" className="h-5 w-5 rounded border-mortgage-purple text-mortgage-purple" disabled />
            <span className="text-sm">Rene Pastor</span>
          </div>
          <div className="flex gap-2 items-center">
            <input type="checkbox" className="h-5 w-5 rounded border-mortgage-purple text-mortgage-purple" disabled />
            <span className="text-sm">Iohana Tapia Garcia</span>
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-2 flex flex-col gap-2">
        <Label className="text-sm font-medium">Address Line 1 *</Label>
        <Input disabled placeholder="Enter street address" />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Unit #</Label>
        <Input disabled placeholder="Enter unit number" />
      </div>
      <div className="md:col-span-1 flex flex-col gap-2">
        <Label className="text-sm font-medium">Intended Occupancy *</Label>
        <Select disabled defaultValue="">
          <SelectTrigger>
            <SelectValue placeholder="Primary Residence" />
          </SelectTrigger>
          <SelectContent>
            {OCCUPANCY_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-2 flex flex-col gap-2">
        <Label className="text-sm font-medium">Address Line 2</Label>
        <Input disabled placeholder="Enter additional address info" />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">City *</Label>
        <Input disabled placeholder="Enter city" />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">State *</Label>
        <Select disabled defaultValue="">
          <SelectTrigger>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {STATES.map(state => (
              <SelectItem key={state} value={state}>{state}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">ZIP Code *</Label>
        <Input disabled placeholder="Enter ZIP code" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Country</Label>
        <Input disabled value="United States" />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Market Value *</Label>
        <div className="flex flex-row items-center gap-2">
          <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
          <Input disabled placeholder="0.00" type="number" className="w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Property Type *</Label>
        <Select disabled defaultValue="">
          <SelectTrigger>
            <SelectValue placeholder="Select property type" />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Status *</Label>
        <Select disabled defaultValue="">
          <SelectTrigger>
            <SelectValue placeholder="Retained" />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_STATUSES.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    {/* Mixed use property radio */}
    <div>
      <Label className="block text-sm font-medium mb-1 text-mortgage-darkPurple">
        Mixed Use Property:
      </Label>
      <span className="block text-xs text-gray-500 mb-3">
        If you will occupy the property, will you set aside space within the property to operate your own business?
        <span className="ml-1 text-gray-400 font-normal">(e.g., daycare facility, medical office, beauty/barber shop)</span>
      </span>
      <RadioGroup className="flex flex-row gap-6" defaultValue="no" disabled>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="yes" id="mixed-yes" disabled />
          <Label htmlFor="mixed-yes" className="text-sm">Yes</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="no" id="mixed-no" disabled />
          <Label htmlFor="mixed-no" className="text-sm">No</Label>
        </div>
      </RadioGroup>
    </div>
    {/* Associated Liabilities Table (just a placeholder) */}
    <div>
      <div className="border-b mb-2 pb-1 border-mortgage-lightPurple">
        <span className="font-semibold text-mortgage-darkPurple text-lg">Associated Liabilities</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50 text-mortgage-darkPurple">
              <th className="font-medium px-2 py-2 border border-gray-200 text-left">ASSOCIATED</th>
              <th className="font-medium px-2 py-2 border border-gray-200 text-left">CREDITOR</th>
              <th className="font-medium px-2 py-2 border border-gray-200 text-left">BALANCE</th>
              <th className="font-medium px-2 py-2 border border-gray-200 text-left">MONTHLY PAYMENT</th>
              <th className="font-medium px-2 py-2 border border-gray-200 text-left">ADDRESS</th>
              <th className="font-medium px-2 py-2 border border-gray-200 text-left">CREDIT LIMIT</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white text-gray-400">
              <td className="px-2 py-2 border border-gray-200 text-center" colSpan={6}>
                Placeholder for associated liabilities
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    {/* Action Bar */}
    <div className="flex justify-end gap-2 pt-4">
      <Button variant="outline" disabled>Cancel</Button>
      <Button className="bg-mortgage-purple text-white" disabled>Save</Button>
      <Button className="bg-mortgage-darkPurple text-white" disabled>Save & Add</Button>
    </div>
  </div>
);

const RealEstateOwnedSection = () => {
  return (
    <div className="max-w-4xl mx-auto mt-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl text-mortgage-darkPurple">Real Estate Owned</CardTitle>
          <Button
            size="sm"
            className="bg-mortgage-purple text-white hover:bg-mortgage-darkPurple flex items-center"
            type="button"
            disabled
          >
            <Plus className="mr-1 h-4 w-4" />
            Add New Real Estate
          </Button>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">
            List properties you currently own. Fill out the details for each property.
          </CardDescription>
          <RealEstateFormPlaceholder />
        </CardContent>
      </Card>
    </div>
  );
};

export default RealEstateOwnedSection;
