
import React from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  Building, 
  PlusCircle, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

const listings = [
  {
    id: 1,
    name: "123 Main St. Listing",
    client: "Dan Corkill",
    value: 450000,
    stage: "Active",
    listedDate: "Apr 5, 2025",
    probability: 80,
    trend: "up",
  },
  {
    id: 2,
    name: "Highland Acres Property",
    client: "Sarah Johnson",
    value: 650000,
    stage: "Under Contract",
    listedDate: "Mar 15, 2025",
    probability: 60,
    trend: "down",
  },
  {
    id: 3,
    name: "Downtown Condo",
    client: "Robert Smith",
    value: 300000,
    stage: "Pending",
    listedDate: "Apr 1, 2025",
    probability: 90,
    trend: "up",
  },
];

const Pipeline = () => {
  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <Button className="bg-green-600 hover:bg-green-700">
          <PlusCircle className="h-4 w-4 mr-2" />
          New Listing
        </Button>
      </div>

      <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Active Listings</div>
            <div className="text-2xl font-bold mt-2">$1,400,000</div>
            <div className="text-sm text-gray-500 mt-1">3 properties</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">This Month</div>
            <div className="text-2xl font-bold mt-2">$0</div>
            <div className="text-sm text-gray-500 mt-1">0 closed deals</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">Last Month</div>
            <div className="text-2xl font-bold mt-2">$350,000</div>
            <div className="text-sm text-gray-500 mt-1">1 closed deal</div>
          </div>
          <div className="p-4 border rounded-md">
            <div className="text-lg font-semibold text-gray-700">YTD</div>
            <div className="text-2xl font-bold mt-2">$1,250,000</div>
            <div className="text-sm text-gray-500 mt-1">4 closed deals</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold">Active Listings</h2>
          <Button variant="outline" size="sm">
            View <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Property
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  List Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Listed Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Sale Probability
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listings.map((listing) => (
                <tr key={listing.id} className="table-row">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {listing.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {listing.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">${listing.value.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {listing.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {listing.listedDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${listing.probability}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-700">{listing.probability}%</span>
                      {listing.trend === "up" ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500 ml-1" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500 ml-1" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
};

export default Pipeline;
