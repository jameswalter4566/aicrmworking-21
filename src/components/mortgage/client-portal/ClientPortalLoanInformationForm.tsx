
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const LOAN_PURPOSES = [
  "Refinance 1st Mortgage",
  "Purchase",
  "Cash Out Refi",
  "Home Equity",
  "Home Improvement",
];

const AMORTIZATION_TYPES = ["Fixed", "ARM"];
const DOC_TYPES = ["Full", "Limited", "Stated"];
const REFI_PURPOSES = ["Rate and Term - Conv", "Cash Out", "No Rate/Term"];
const PROPERTY_TYPES = [
  "Single Family Residence", "Condo", "2-4 Units", "Multi-Family", "Manufactured", "Townhome", "Other"
];
const OCCUPANCY_TYPES = [
  "Primary Residence", "Second Home", "Investment", "Vacant", "Other"
];
const ATTACHMENT_TYPES = ["Detached", "Attached"];
const STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];
const PROPERTY_MANNER = ["Sole Ownership", "Husband and Wife", "Tenants in Common", "Joint Tenancy"];
const PROPERTY_RIGHTS = ["Fee Simple", "Leasehold"];

export default function ClientPortalLoanInformationForm() {
  const [activeTab, setActiveTab] = useState<"terms" | "property">("terms");

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <CardTitle className="text-xl flex items-center gap-2 text-mortgage-darkPurple">
          <span>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" className="inline-block"><g stroke="#7E69AB" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 9v6M12 9v6M16 9v6"/></g></svg>
          </span>
          Loan Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-6 py-2 text-sm font-semibold rounded-t-lg transition-colors duration-150 ${
              activeTab === "terms"
                ? "bg-white border-b-2 border-mortgage-purple text-mortgage-darkPurple"
                : "bg-gray-50 text-gray-400 hover:text-mortgage-darkPurple"
            }`}
            onClick={() => setActiveTab("terms")}
            type="button"
          >
            MORTGAGE PURPOSE, TYPES & TERMS
          </button>
          <button
            className={`px-6 py-2 text-sm font-semibold rounded-t-lg transition-colors duration-150 ${
              activeTab === "property"
                ? "bg-white border-b-2 border-mortgage-purple text-mortgage-darkPurple"
                : "bg-gray-50 text-gray-400 hover:text-mortgage-darkPurple"
            }`}
            onClick={() => setActiveTab("property")}
            type="button"
          >
            SUBJECT PROPERTY
          </button>
        </div>
        {activeTab === "terms" ? (
          <form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Mortgage Applied For</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Conventional" />
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
                <Label>Amortization Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Fixed" />
                  </SelectTrigger>
                  <SelectContent>
                    {AMORTIZATION_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Loan FICO</Label>
                <Input type="text" placeholder="" />
              </div>
              <div>
                <Label>Documentation Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Full" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Interest Rate</Label>
                <div className="flex items-center gap-2">
                  <Input type="text" placeholder="" />
                  <span className="ml-1 text-gray-500 text-xs">%</span>
                </div>
              </div>
              <div>
                <Label>Amortized No. Of Payments</Label>
                <Input type="text" placeholder="360" />
              </div>
              <div>
                <Label>Mortgage Purpose</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Refinance 1st Mortgage" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAN_PURPOSES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Refinance Purpose</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Rate and Term - Conv" />
                  </SelectTrigger>
                  <SelectContent>
                    {REFI_PURPOSES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Appraised Value</Label>
                <div className="flex items-center">
                  <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
                  <Input type="number" placeholder="" className="w-full" />
                </div>
              </div>
              <div>
                <Label>Base Loan Amount</Label>
                <div className="flex items-center">
                  <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
                  <Input type="number" placeholder="" className="w-full" />
                </div>
              </div>
              <div>
                <Label>Financed Fees</Label>
                <div className="flex items-center">
                  <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
                  <Input type="number" placeholder="0.00" className="w-full" />
                </div>
              </div>
              <div>
                <Label>Total Loan Amount</Label>
                <div className="flex items-center">
                  <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
                  <Input type="number" placeholder="" className="w-full" />
                </div>
              </div>
              <div>
                <Label>Second Loan Amount</Label>
                <div className="flex items-center">
                  <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
                  <Input type="number" placeholder="0.00" className="w-full" />
                </div>
              </div>
              <div>
                <Label>LTV</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="" />
                  <span className="ml-1 text-gray-500 text-xs">%</span>
                </div>
              </div>
              <div>
                <Label>CLTV</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="" />
                  <span className="ml-1 text-gray-500 text-xs">%</span>
                </div>
              </div>
              <div>
                <Label>TLTV</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="" />
                  <span className="ml-1 text-gray-500 text-xs">%</span>
                </div>
              </div>
              <div>
                <Label>Year Acquired</Label>
                <Input type="text" placeholder="" />
              </div>
              <div>
                <Label>Amount Existing Liens</Label>
                <div className="flex items-center">
                  <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
                  <Input type="number" placeholder="0.00" className="w-full" />
                </div>
              </div>
              <div>
                <Label>Original Cost</Label>
                <div className="flex items-center">
                  <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
                  <Input type="number" placeholder="" className="w-full" />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-8">
              <Button className="bg-sky-400 text-white hover:bg-sky-500 flex items-center px-6 py-2 rounded-lg" type="button" disabled>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#fff" strokeWidth="2" /><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" /></svg>
                Save Loan Information
              </Button>
            </div>
          </form>
        ) : (
          <form>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>Property Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Single Family Residence" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Occupancy</Label>
                <Select>
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
              <div>
                <Label>Attachment Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Detached" />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTACHMENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Address Line 1</Label>
                <Input type="text" />
              </div>
              <div>
                <Label>Unit #</Label>
                <Input type="text" />
              </div>
              <div>
                <Label>City</Label>
                <Input type="text" />
              </div>
              <div>
                <Label>State</Label>
                <Select>
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
              <div>
                <Label>ZIP Code</Label>
                <Input type="text" />
              </div>
              <div>
                <Label>County</Label>
                <Input type="text" />
              </div>
              <div>
                <Label>Number Of Units</Label>
                <Input type="number" placeholder="1" />
              </div>
              <div>
                <Label>Year Built</Label>
                <Input type="number" />
              </div>
            </div>
            <div className="mt-6 flex gap-8 flex-wrap">
              <div className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-blue-600" disabled />
                <span className="text-xs text-gray-700">Land Contract Conversion</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-blue-600" disabled />
                <span className="text-xs text-gray-700">New Construction</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <Label>Title To Be Held In</Label>
                <Input type="text" />
              </div>
              <div>
                <Label>Manner Held</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Husband and Wife" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_MANNER.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property Rights</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Fee Simple" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_RIGHTS.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-8">
              <Label className="mb-2 block font-medium text-mortgage-darkPurple">Mixed Use Property:</Label>
              <span className="block text-xs text-gray-500 mb-3">
                If you will occupy the property, will you set aside space within the property to operate your own business?
                <span className="ml-1 text-gray-400 font-normal">(e.g., daycare facility, medical office, beauty/barber shop)</span>
              </span>
              <RadioGroup className="flex flex-row gap-6 mb-4" defaultValue="no">
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
            {/* Rental Income Calculator */}
            <div className="mt-10 border-t pt-6">
              <h4 className="text-mortgage-darkPurple text-base font-semibold mb-3">Rental Income Calculator</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <Label>Gross Monthly Rent</Label>
                  <div className="flex items-center">
                    <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
                    <Input type="number" placeholder="0.00" className="w-full" />
                  </div>
                </div>
                <div>
                  <Label>Vacancy Factor</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="0.00" />
                    <span className="ml-1 text-gray-500 text-xs">%</span>
                  </div>
                </div>
                <div>
                  <Label>Adjusted Monthly Gross Income</Label>
                  <div className="flex items-center">
                    <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
                    <Input type="number" placeholder="0.00" className="w-full" />
                  </div>
                </div>
                <div>
                  <Label>Net Rental Income</Label>
                  <div className="flex items-center">
                    <span className="bg-gray-100 px-2 py-2 border rounded text-gray-600">$</span>
                    <Input type="number" placeholder="0.00" className="w-full" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-8">
              <Button className="bg-sky-400 text-white hover:bg-sky-500 flex items-center px-6 py-2 rounded-lg" type="button" disabled>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#fff" strokeWidth="2" /><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" /></svg>
                Save Property Information
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
