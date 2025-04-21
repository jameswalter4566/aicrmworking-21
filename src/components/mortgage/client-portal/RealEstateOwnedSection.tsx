
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Placeholder for a new real estate entry row
const RealEstateFormPlaceholder = () => (
  <div className="my-4 p-4 rounded-lg border bg-gray-50 flex flex-col space-y-4">
    <h3 className="text-lg font-semibold text-mortgage-darkPurple">Add New Real Estate</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-600">Property Address</label>
        <input disabled type="text" className="w-full border rounded px-3 py-2 bg-gray-200 cursor-not-allowed" placeholder="123 Main St, City, State" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600">Property Type</label>
        <input disabled type="text" className="w-full border rounded px-3 py-2 bg-gray-200 cursor-not-allowed" placeholder="Single Family, Condo, etc." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600">Current Value</label>
        <input disabled type="number" className="w-full border rounded px-3 py-2 bg-gray-200 cursor-not-allowed" placeholder="$" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600">Unpaid Balance</label>
        <input disabled type="number" className="w-full border rounded px-3 py-2 bg-gray-200 cursor-not-allowed" placeholder="$" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600">Monthly Payment</label>
        <input disabled type="number" className="w-full border rounded px-3 py-2 bg-gray-200 cursor-not-allowed" placeholder="$" />
      </div>
    </div>
  </div>
);

const RealEstateOwnedSection = () => {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-4xl mx-auto mt-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl text-mortgage-darkPurple">Real Estate Owned</CardTitle>
          <Button
            size="sm"
            className="bg-mortgage-purple text-white hover:bg-mortgage-darkPurple flex items-center"
            onClick={() => setShowForm(true)}
            type="button"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">
            List properties you currently own. Click <b>Add</b> to add new properties.
          </CardDescription>
          {showForm && (
            <RealEstateFormPlaceholder />
          )}
          {!showForm && (
            <div className="border border-dashed rounded-lg p-6 text-gray-400 text-center my-4 bg-gray-100">
              No real estate added yet. Click "Add" to begin.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealEstateOwnedSection;

