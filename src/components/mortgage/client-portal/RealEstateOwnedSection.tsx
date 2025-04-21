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

const MORTGAGE_TYPES = [
  "Conventional", "FHA", "VA", "USDA", "Jumbo", "Non-QM"
];
const AMORTIZATION_TYPES = [
  "Fixed", "ARM"
];
const DOC_TYPE = [
  "Full", "Limited", "Alt Doc", "Stated", "Other"
];
const MORTGAGE_PURPOSES = [
  "Purchase", "Refinance 1st Mortgage", "Refinance 2nd Mortgage", "Cash-Out Refi", "Home Equity", "Other"
];
const REFINANCE_PURPOSES = [
  "Rate and Term - Conv", "Cash Out", "Streamline", "Other"
];
const PROPERTY_RIGHTS = [
  "Fee Simple", "Leasehold"
];
const ATTACHMENT_TYPES = [
  "Detached", "Attached", "Co-op", "Planned Unit Development", "Other"
];
const MANNER_HELD = [
  "Sole Ownership", "Joint Tenancy", "Tenants in Common", "Husband and Wife", "Other"
];

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

function LoanInfoTabs({ tab, setTab }: { tab: string, setTab: (x: string) => void }) {
  return (
    <div className="flex mb-4 border-b text-xs font-medium">
      <button
        className={`px-4 py-2 min-w-[200px] border-b-2 transition-colors ${tab === "purpose" ? "border-mortgage-purple text-mortgage-darkPurple bg-white" : "border-transparent text-gray-400 bg-gray-100"}`}
        onClick={() => setTab("purpose")}
        type="button"
        tabIndex={-1}
      >
        MORTGAGE PURPOSE, TYPES & TERMS
      </button>
      <button
        className={`px-4 py-2 min-w-[200px] border-b-2 transition-colors ${tab === "property" ? "border-mortgage-purple text-mortgage-darkPurple bg-white" : "border-transparent text-gray-400 bg-gray-100"}`}
        onClick={() => setTab("property")}
        type="button"
        tabIndex={-1}
      >
        SUBJECT PROPERTY
      </button>
    </div>
  );
}

function LoanPurposeFields() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Mortgage Applied For</Label>
        <Select disabled defaultValue="">
          <SelectTrigger className="bg-gray-100 border rounded">
            <SelectValue placeholder="Conventional" />
          </SelectTrigger>
          <SelectContent>
            {MORTGAGE_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Amortization Type</Label>
        <Select disabled defaultValue="">
          <SelectTrigger className="bg-gray-100 border rounded">
            <SelectValue placeholder="Fixed" />
          </SelectTrigger>
          <SelectContent>
            {AMORTIZATION_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Loan FICO</Label>
        <Input disabled placeholder="" />
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Documentation Type</Label>
        <Select disabled defaultValue="">
          <SelectTrigger className="bg-gray-100 border rounded">
            <SelectValue placeholder="Full" />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPE.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Interest Rate</Label>
        <div className="flex items-center">
          <Input disabled placeholder="" type="number" className="rounded-l" />
          <span className="bg-gray-100 px-3 py-2 rounded-r border border-l-0 border-gray-200 text-gray-600 text-xs">%</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Amortized No. Of Payments</Label>
        <Input disabled placeholder="360" type="number" />
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Mortgage Purpose</Label>
        <Select disabled defaultValue="">
          <SelectTrigger className="bg-gray-100 border rounded">
            <SelectValue placeholder="Refinance 1st Mortgage" />
          </SelectTrigger>
          <SelectContent>
            {MORTGAGE_PURPOSES.map(purpose => (
              <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Refinance Purpose</Label>
        <Select disabled defaultValue="">
          <SelectTrigger className="bg-gray-100 border rounded">
            <SelectValue placeholder="Rate and Term - Conv" />
          </SelectTrigger>
          <SelectContent>
            {REFINANCE_PURPOSES.map(purpose => (
              <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Appraised Value</Label>
        <div className="flex items-center">
          <span className="bg-gray-100 px-2 py-2 border rounded-l text-gray-600">$</span>
          <Input disabled placeholder="" type="number" className="rounded-r" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Base Loan Amount</Label>
        <div className="flex items-center">
          <span className="bg-gray-100 px-2 py-2 border rounded-l text-gray-600">$</span>
          <Input disabled placeholder="" type="number" className="rounded-r" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Financed Fees</Label>
        <div className="flex items-center">
          <span className="bg-gray-100 px-2 py-2 border rounded-l text-gray-600">$</span>
          <Input disabled placeholder="0.00" type="number" className="rounded-r" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Total Loan Amount</Label>
        <div className="flex items-center">
          <span className="bg-gray-100 px-2 py-2 border rounded-l text-gray-600">$</span>
          <Input disabled placeholder="" type="number" className="rounded-r" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Second Loan Amount</Label>
        <div className="flex items-center">
          <span className="bg-gray-100 px-2 py-2 border rounded-l text-gray-600">$</span>
          <Input disabled placeholder="0.00" type="number" className="rounded-r" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">LTV</Label>
        <div className="flex items-center">
          <Input disabled placeholder="" type="number" className="rounded-l" />
          <span className="bg-gray-100 px-3 py-2 rounded-r border border-l-0 border-gray-200 text-gray-600 text-xs">%</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">CLTV</Label>
        <div className="flex items-center">
          <Input disabled placeholder="" type="number" className="rounded-l" />
          <span className="bg-gray-100 px-3 py-2 rounded-r border border-l-0 border-gray-200 text-gray-600 text-xs">%</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">TLTV</Label>
        <div className="flex items-center">
          <Input disabled placeholder="" type="number" className="rounded-l" />
          <span className="bg-gray-100 px-3 py-2 rounded-r border border-l-0 border-gray-200 text-gray-600 text-xs">%</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Year Acquired</Label>
        <Input disabled placeholder="" type="number" />
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Amount Existing Liens</Label>
        <div className="flex items-center">
          <span className="bg-gray-100 px-2 py-2 border rounded-l text-gray-600">$</span>
          <Input disabled placeholder="0.00" type="number" className="rounded-r" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold">Original Cost</Label>
        <div className="flex items-center">
          <span className="bg-gray-100 px-2 py-2 border rounded-l text-gray-600">$</span>
          <Input disabled placeholder="" type="number" className="rounded-r" />
        </div>
      </div>
    </div>
  );
}

function SubjectPropertyFields() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">Property Type</Label>
          <Select disabled defaultValue="">
            <SelectTrigger className="bg-gray-100 border rounded">
              <SelectValue placeholder="Single Family Residence" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">Occupancy</Label>
          <Select disabled defaultValue="">
            <SelectTrigger className="bg-gray-100 border rounded">
              <SelectValue placeholder="Primary Residence" />
            </SelectTrigger>
            <SelectContent>
              {OCCUPANCY_TYPES.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">Attachment Type</Label>
          <Select disabled defaultValue="">
            <SelectTrigger className="bg-gray-100 border rounded">
              <SelectValue placeholder="Detached" />
            </SelectTrigger>
            <SelectContent>
              {ATTACHMENT_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">Address Line 1</Label>
          <Input disabled placeholder="" />
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">Unit #</Label>
          <Input disabled placeholder="" />
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">City</Label>
          <Input disabled placeholder="" />
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">State</Label>
          <Select disabled defaultValue="">
            <SelectTrigger className="bg-gray-100 border rounded">
              <SelectValue placeholder="California" />
            </SelectTrigger>
            <SelectContent>
              {STATES.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">ZIP Code</Label>
          <Input disabled placeholder="" />
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">County</Label>
          <Input disabled placeholder="" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">Number Of Units</Label>
          <Input disabled placeholder="1" type="number" />
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">Year Built</Label>
          <Input disabled placeholder="" type="number" />
        </div>
        <div className="flex items-center pt-5 gap-2">
          <input type="checkbox" disabled className="accent-mortgage-purple border-mortgage-purple w-5 h-5" />
          <Label className="text-xs font-medium">New Construction</Label>
        </div>
        <div className="flex items-center pt-5 gap-2">
          <input type="checkbox" disabled className="accent-mortgage-purple border-mortgage-purple w-5 h-5" />
          <Label className="text-xs font-medium">Land Contract Conversion</Label>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">Title To Be Held In</Label>
          <Input disabled placeholder="" />
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">Manner Held</Label>
          <Select disabled defaultValue="">
            <SelectTrigger className="bg-gray-100 border rounded">
              <SelectValue placeholder="Husband and Wife" />
            </SelectTrigger>
            <SelectContent>
              {MANNER_HELD.map(manner => (
                <SelectItem key={manner} value={manner}>{manner}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-3">
          <Label className="text-xs font-semibold">Property Rights</Label>
          <Select disabled defaultValue="">
            <SelectTrigger className="bg-gray-100 border rounded">
              <SelectValue placeholder="Fee Simple" />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_RIGHTS.map(right => (
                <SelectItem key={right} value={right}>{right}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-2">
        <Label className="font-semibold text-xs">Mixed Use Property:</Label>
        <span className="block text-xs text-gray-500 mb-2">
          If you will occupy the property, will you set aside space within the property to operate your own business?{" "}
          <span className="ml-1 text-gray-400 font-normal">(e.g., daycare facility, medical office, beauty/barber shop)</span>
        </span>
        <RadioGroup className="flex flex-row gap-6" defaultValue="no" disabled>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="yes" id="sp-mixed-yes" disabled />
            <Label htmlFor="sp-mixed-yes" className="text-sm">Yes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id="sp-mixed-no" disabled />
            <Label htmlFor="sp-mixed-no" className="text-sm">No</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="mt-6 rounded-lg border bg-gray-50 p-4">
        <div className="font-bold text-mortgage-darkPurple text-sm mb-3">RENTAL INCOME CALCULATOR</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">Gross Monthly Rent</Label>
            <div className="flex items-center">
              <span className="bg-gray-100 px-2 py-2 border rounded-l text-gray-600">$</span>
              <Input disabled placeholder="0.00" type="number" className="rounded-r" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">Vacancy Factor</Label>
            <div className="flex items-center">
              <Input disabled placeholder="0.00" type="number" className="rounded-l" />
              <span className="bg-gray-100 px-3 py-2 rounded-r border border-l-0 border-gray-200 text-gray-600 text-xs">%</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">Adjusted Monthly Gross Income</Label>
            <div className="flex items-center">
              <span className="bg-gray-100 px-2 py-2 border rounded-l text-gray-600">$</span>
              <Input disabled placeholder="0.00" type="number" className="rounded-r" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-semibold">Net Rental Income</Label>
            <div className="flex items-center">
              <span className="bg-gray-100 px-2 py-2 border rounded-l text-gray-600">$</span>
              <Input disabled placeholder="0.00" type="number" className="rounded-r" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoanInformationCard() {
  const [tab, setTab] = useState<"purpose" | "property">("purpose");

  return (
    <Card className="mt-8 border-2 border-mortgage-purple">
      <CardHeader className="pb-2 flex flex-row gap-3 items-center">
        <span className="text-mortgage-purple font-bold text-xl flex items-center">
          <span className="mr-2">$</span>
          LOAN INFORMATION
        </span>
      </CardHeader>
      <CardContent>
        <LoanInfoTabs tab={tab} setTab={v => setTab(v as "purpose" | "property")} />

        <div className="mt-4 mb-4">
          {tab === "purpose" ? <LoanPurposeFields /> : <SubjectPropertyFields />}
        </div>
        <div className="flex w-full justify-end mt-4">
          {tab === "purpose" ? (
            <Button disabled className="bg-sky-400 text-white px-6 py-2 rounded-md font-bold">
              <span className="flex items-center gap-2">
                <span className="text-lg">&#128274;</span> Save Loan Information
              </span>
            </Button>
          ) : (
            <Button disabled className="bg-sky-500 text-white px-6 py-2 rounded-md font-bold">
              <span className="flex items-center gap-2">
                <span className="text-lg">&#128274;</span> Save Property Information
              </span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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
      <LoanInformationCard />
    </div>
  );
};

export default RealEstateOwnedSection;
