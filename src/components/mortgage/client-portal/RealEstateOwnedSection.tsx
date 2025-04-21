
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Plus } from "lucide-react";

const ownerOptions = [
  "Rene Pastor",
  "Iohana Tapia Garcia",
];
const borrowerOptions = [
  "Rene Pastor",
  "Iohana Tapia Garcia",
];

const propertyTypes = [
  "Single Family",
  "Condo",
  "2-4 Unit",
  "Townhouse",
  "Multi-Family",
  "Other"
];

const states = [
  "CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "Other"
];

const countries = [
  "United States",
  "Canada",
  "Mexico",
  "Other"
];

export const RealEstateOwnedSection = () => {
  const [showForm, setShowForm] = useState(false);

  // simple state for each field to show placeholders
  const [formData, setFormData] = useState({
    address1: "",
    unit: "",
    address2: "",
    occupancy: "Primary Residence",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    marketValue: "",
    propertyType: "",
    status: "Retained",
    mixedUse: "",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Real Estate Owned</h3>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="bg-mortgage-purple hover:bg-mortgage-darkPurple">
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      {!showForm && (
        <Card className="mb-4">
          <CardContent className="py-8 flex flex-col items-center">
            <div className="text-gray-600 font-medium mb-1">No real estate properties have been added yet.</div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="space-y-0">
          <CardHeader>
            <CardTitle className="text-lg">Add New Real Estate</CardTitle>
            <CardDescription>REAL ESTATE DETAILS</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="text-xs text-gray-500 mb-1">Subject Property</div>
                <div className="font-semibold">Real Estate Owners:</div>
                <ul className="flex flex-wrap gap-2 mb-2">
                  {ownerOptions.map((owner) => (
                    <li key={owner} className="px-3 py-1 bg-gray-100 rounded">{owner}</li>
                  ))}
                </ul>
                <div className="font-semibold">Borrower(s) Using This As Primary Address:</div>
                <ul className="flex flex-wrap gap-2 mb-4">
                  {borrowerOptions.map((borrower) => (
                    <li key={borrower} className="px-3 py-1 bg-gray-100 rounded">{borrower}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Address Line 1 *</label>
                  <input type="text" className="w-full border rounded px-2 py-1" placeholder="Enter street address" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Unit #</label>
                  <input type="text" className="w-full border rounded px-2 py-1" placeholder="Enter unit number" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Address Line 2</label>
                  <input type="text" className="w-full border rounded px-2 py-1" placeholder="Enter additional address info" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Intended Occupancy *</label>
                  <select className="w-full border rounded px-2 py-1">
                    <option>Primary Residence</option>
                    <option>Second Home</option>
                    <option>Investment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">City *</label>
                  <input type="text" className="w-full border rounded px-2 py-1" placeholder="Enter city" />
                </div>
                <div>
                  <label className="block text-sm mb-1">State *</label>
                  <select className="w-full border rounded px-2 py-1">
                    <option value="">Select state</option>
                    {states.map((st) => (
                      <option value={st} key={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">ZIP Code *</label>
                  <input type="text" className="w-full border rounded px-2 py-1" placeholder="Enter ZIP code" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Country *</label>
                  <select className="w-full border rounded px-2 py-1">
                    {countries.map((cty) => (
                      <option key={cty}>{cty}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Market Value *</label>
                  <input type="text" className="w-full border rounded px-2 py-1" placeholder="$0.00" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Property Type *</label>
                  <select className="w-full border rounded px-2 py-1">
                    <option value="">Select property type</option>
                    {propertyTypes.map((type) => (
                      <option value={type} key={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Status *</label>
                  <select className="w-full border rounded px-2 py-1">
                    <option>Retained</option>
                    <option>Sold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Mixed Use Property</label>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center cursor-pointer">
                      <input type="radio" name="mixedUse" value="yes" className="mr-1" />
                      Yes
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input type="radio" name="mixedUse" value="no" className="mr-1" />
                      No
                    </label>
                  </div>
                  <span className="block text-xs text-gray-500 mt-1">
                    If you will occupy the property, will you set aside space within the property to operate your own business? (e.g., daycare facility, medical office, beauty/barber shop)
                  </span>
                </div>
              </div>

              {/* Associated Liabilities Table Placeholder */}
              <div className="mt-6">
                <h4 className="text-base font-semibold mb-2">Associated Liabilities</h4>
                <div className="overflow-x-auto rounded border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left">ASSOCIATED</th>
                        <th className="p-2">CREDITOR</th>
                        <th className="p-2">BALANCE</th>
                        <th className="p-2">MONTHLY PAYMENT</th>
                        <th className="p-2">ADDRESS</th>
                        <th className="p-2">CREDIT LIMIT</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 text-gray-500 text-center" colSpan={6}>
                          No associated liabilities yet
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button className="bg-mortgage-purple">Save</Button>
            <Button className="bg-mortgage-darkPurple text-white">Save & Add</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default RealEstateOwnedSection;
