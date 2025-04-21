
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

const inputClass = "w-full border-gray-200 rounded-lg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300";

const selectClass = "w-full border-gray-200 rounded-lg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300";
const labelClass = "block text-xs font-semibold text-neutral-600 mb-1";
const formGrid = "grid grid-cols-1 md:grid-cols-2 gap-6";

// Default values for demonstration (no db integration yet)
const initialFormA = {
  loanType: "Conventional",
  amortizationType: "Fixed",
  loanFico: "",
  documentationType: "Full",
  interestRate: "",
  amortizedPayments: "360",
  loanPurpose: "Refinance 1st Mortgage",
  refinancePurpose: "Rate and Term - Conv",
  appraisedValue: "",
  baseLoanAmount: "",
  financedFees: "0.00",
  totalLoanAmount: "",
  secondLoanAmount: "0.00",
  ltv: "",
  cltv: "",
  tltv: "",
  yearAcquired: "",
  existingLiens: "0.00",
  originalCost: "",
};

const initialFormB = {
  propertyType: "Single Family Residence",
  occupancy: "Primary Residence",
  attachmentType: "Detached",
  address: "",
  city: "",
  state: "California",
  zip: "",
  county: "",
  unit: "",
  yearBuilt: "",
  numUnits: "1",
  newConstruction: false,
  landContract: false,
  titleHeldIn: "",
  mannerHeld: "Husband and Wife",
  propertyRights: "Fee Simple",
  mixedUse: "No",
  grossRent: "0.00",
  vacancyFactor: "0.00",
  adjustedGross: "0.00",
  netRental: "0.00",
};

const tabStyles = "bg-gray-100 rounded-t-md h-10 flex items-center px-4 font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow";

export default function ClientPortalLoanSummary() {
  const [activeTab, setActiveTab] = useState<"purpose" | "property">("purpose");
  const [formA, setFormA] = useState(initialFormA);
  const [formB, setFormB] = useState(initialFormB);

  const handleChangeA = (e: any) => setFormA({ ...formA, [e.target.name]: e.target.value });
  const handleChangeB = (e: any) => setFormB({ ...formB, [e.target.name]: e.target.value });

  return (
    <Card className="mt-10">
      <CardHeader className="flex flex-row gap-2 items-center">
        <DollarSign className="text-blue-700" />
        <CardTitle className="text-lg font-bold tracking-tight">Loan Information</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="w-full">
          <TabsList className="flex w-full mb-4 border-b border-gray-200 bg-transparent rounded-none p-0">
            <TabsTrigger value="purpose" className={tabStyles + " basis-1/2"}>Mortgage Purpose, Types & Terms</TabsTrigger>
            <TabsTrigger value="property" className={tabStyles + " basis-1/2"}>Subject Property</TabsTrigger>
          </TabsList>
          <TabsContent value="purpose">
            <form className={formGrid + " gap-y-4"}>
              <div>
                <label className={labelClass}>Mortgage Applied For</label>
                <select name="loanType" value={formA.loanType} onChange={handleChangeA} className={selectClass}>
                  <option>Conventional</option>
                  <option>FHA</option>
                  <option>VA</option>
                  <option>USDA</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Amortization Type</label>
                <select name="amortizationType" value={formA.amortizationType} onChange={handleChangeA} className={selectClass}>
                  <option>Fixed</option>
                  <option>ARM</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Loan FICO</label>
                <input name="loanFico" value={formA.loanFico} onChange={handleChangeA} className={inputClass} placeholder="Enter FICO" />
              </div>
              <div>
                <label className={labelClass}>Documentation Type</label>
                <select name="documentationType" value={formA.documentationType} onChange={handleChangeA} className={selectClass}>
                  <option>Full</option>
                  <option>Lite Doc</option>
                  <option>No Doc</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Interest Rate</label>
                <div className="relative">
                  <input name="interestRate" value={formA.interestRate} onChange={handleChangeA} className={inputClass + " pr-8"} placeholder="%" />
                  <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Amortized No. Of Payments</label>
                <input name="amortizedPayments" value={formA.amortizedPayments} onChange={handleChangeA} className={inputClass} placeholder="360" />
              </div>
              <div>
                <label className={labelClass}>Mortgage Purpose</label>
                <select name="loanPurpose" value={formA.loanPurpose} onChange={handleChangeA} className={selectClass}>
                  <option>Refinance 1st Mortgage</option>
                  <option>Purchase</option>
                  <option>Home Equity</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Refinance Purpose</label>
                <select name="refinancePurpose" value={formA.refinancePurpose} onChange={handleChangeA} className={selectClass}>
                  <option>Rate and Term - Conv</option>
                  <option>Cash Out</option>
                  <option>Debt Consolidation</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Appraised Value</label>
                <input name="appraisedValue" value={formA.appraisedValue} onChange={handleChangeA} className={inputClass} placeholder="$" />
              </div>
              <div>
                <label className={labelClass}>Base Loan Amount</label>
                <input name="baseLoanAmount" value={formA.baseLoanAmount} onChange={handleChangeA} className={inputClass} placeholder="$" />
              </div>
              <div>
                <label className={labelClass}>Financed Fees</label>
                <input name="financedFees" value={formA.financedFees} onChange={handleChangeA} className={inputClass} placeholder="$ 0.00" />
              </div>
              <div>
                <label className={labelClass}>Total Loan Amount</label>
                <input name="totalLoanAmount" value={formA.totalLoanAmount} onChange={handleChangeA} className={inputClass} placeholder="$" />
              </div>
              <div>
                <label className={labelClass}>Second Loan Amount</label>
                <input name="secondLoanAmount" value={formA.secondLoanAmount} onChange={handleChangeA} className={inputClass} placeholder="$ 0.00" />
              </div>
              <div>
                <label className={labelClass}>LTV</label>
                <input name="ltv" value={formA.ltv} onChange={handleChangeA} className={inputClass} placeholder="%" />
              </div>
              <div>
                <label className={labelClass}>CLTV</label>
                <input name="cltv" value={formA.cltv} onChange={handleChangeA} className={inputClass} placeholder="%" />
              </div>
              <div>
                <label className={labelClass}>TLTV</label>
                <input name="tltv" value={formA.tltv} onChange={handleChangeA} className={inputClass} placeholder="%" />
              </div>
              <div>
                <label className={labelClass}>Year Acquired</label>
                <input name="yearAcquired" value={formA.yearAcquired} onChange={handleChangeA} className={inputClass} placeholder="YYYY" />
              </div>
              <div>
                <label className={labelClass}>Amount Existing Liens</label>
                <input name="existingLiens" value={formA.existingLiens} onChange={handleChangeA} className={inputClass} placeholder="$ 0.00" />
              </div>
              <div>
                <label className={labelClass}>Original Cost</label>
                <input name="originalCost" value={formA.originalCost} onChange={handleChangeA} className={inputClass} placeholder="$" />
              </div>
            </form>
            <div className="flex justify-end mt-6">
              <Button type="button" className="bg-sky-400 hover:bg-sky-500 text-white font-semibold">
                <span className="flex items-center gap-2">
                  <DollarSign size={18} /> Save Loan Information
                </span>
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="property">
            <form className={formGrid + " gap-y-4"}>
              <div>
                <label className={labelClass}>Property Type</label>
                <select name="propertyType" value={formB.propertyType} onChange={handleChangeB} className={selectClass}>
                  <option>Single Family Residence</option>
                  <option>Condo</option>
                  <option>PUD</option>
                  <option>Multi-Family</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Occupancy</label>
                <select name="occupancy" value={formB.occupancy} onChange={handleChangeB} className={selectClass}>
                  <option>Primary Residence</option>
                  <option>Second Home</option>
                  <option>Investment</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Attachment Type</label>
                <select name="attachmentType" value={formB.attachmentType} onChange={handleChangeB} className={selectClass}>
                  <option>Detached</option>
                  <option>Attached</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Address Line 1</label>
                <input name="address" value={formB.address} onChange={handleChangeB} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Unit #</label>
                <input name="unit" value={formB.unit} onChange={handleChangeB} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input name="city" value={formB.city} onChange={handleChangeB} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input name="state" value={formB.state} onChange={handleChangeB} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>ZIP Code</label>
                <input name="zip" value={formB.zip} onChange={handleChangeB} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>County</label>
                <input name="county" value={formB.county} onChange={handleChangeB} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Number Of Units</label>
                <input name="numUnits" value={formB.numUnits} onChange={handleChangeB} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Year Built</label>
                <input name="yearBuilt" value={formB.yearBuilt} onChange={handleChangeB} className={inputClass} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formB.newConstruction}
                  onChange={e => setFormB(f => ({ ...f, newConstruction: e.target.checked }))}
                  className="accent-sky-500"
                  id="newConstruction"
                />
                <label htmlFor="newConstruction" className="text-sm">New Construction</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formB.landContract}
                  onChange={e => setFormB(f => ({ ...f, landContract: e.target.checked }))}
                  className="accent-sky-500"
                  id="landContract"
                />
                <label htmlFor="landContract" className="text-sm">Land Contract Conversion</label>
              </div>
              <div>
                <label className={labelClass}>Title To Be Held In</label>
                <input name="titleHeldIn" value={formB.titleHeldIn} onChange={handleChangeB} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Manner Held</label>
                <select name="mannerHeld" value={formB.mannerHeld} onChange={handleChangeB} className={selectClass}>
                  <option>Husband and Wife</option>
                  <option>Single</option>
                  <option>Tenants in Common</option>
                  <option>Joint Tenants</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Property Rights</label>
                <select name="propertyRights" value={formB.propertyRights} onChange={handleChangeB} className={selectClass}>
                  <option>Fee Simple</option>
                  <option>Leasehold</option>
                </select>
              </div>
              <div className="col-span-2 mt-3">
                <label className={labelClass + " mb-0"}>Mixed Use Property:</label>
                <div className="flex items-center mt-1 gap-6">
                  <span className="text-sm text-gray-600 mr-2">
                    If you will occupy the property, will you set aside space within the property to operate your own business? (e.g., daycare, beauty shop)
                  </span>
                  <label className="flex items-center gap-2">
                    <input type="radio" value="Yes" checked={formB.mixedUse === "Yes"} onChange={() => setFormB(f => ({ ...f, mixedUse: "Yes" }))} />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" value="No" checked={formB.mixedUse === "No"} onChange={() => setFormB(f => ({ ...f, mixedUse: "No" }))} />
                    No
                  </label>
                </div>
              </div>
            </form>
            {/* Rental Income Calculator */}
            <div className="border-t mt-8 pt-4">
              <p className="font-semibold text-blue-800">Rental Income Calculator</p>
              <div className="grid md:grid-cols-4 grid-cols-1 gap-4 mt-2">
                <div>
                  <label className={labelClass}>Gross Monthly Rent</label>
                  <div className="relative">
                    <input name="grossRent" value={formB.grossRent} onChange={handleChangeB} className={inputClass + " pr-8"} placeholder="$ 0.00" />
                    <span className="absolute right-3 top-2.5 text-gray-400 text-sm">$</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Vacancy Factor</label>
                  <div className="relative">
                    <input name="vacancyFactor" value={formB.vacancyFactor} onChange={handleChangeB} className={inputClass + " pr-8"} placeholder="0.00" />
                    <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Adjusted Monthly Gross Income</label>
                  <div className="relative">
                    <input name="adjustedGross" value={formB.adjustedGross} onChange={handleChangeB} className={inputClass + " pr-8"} placeholder="$ 0.00" />
                    <span className="absolute right-3 top-2.5 text-gray-400 text-sm">$</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Net Rental Income</label>
                  <div className="relative">
                    <input name="netRental" value={formB.netRental} onChange={handleChangeB} className={inputClass + " pr-8"} placeholder="$ 0.00" />
                    <span className="absolute right-3 top-2.5 text-gray-400 text-sm">$</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button type="button" className="bg-sky-400 hover:bg-sky-500 text-white font-semibold">
                  <span className="flex items-center gap-2">
                    <DollarSign size={18} /> Save Property Information
                  </span>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
