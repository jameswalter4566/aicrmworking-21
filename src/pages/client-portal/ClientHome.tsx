
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const ClientHome = () => {
  // Sample data - in a real app, this would come from an API
  const loanOfficer = {
    name: "James Walter",
    phone: "(555) 123-4567",
    email: "james.walter@example.com",
    photo: "https://randomuser.me/api/portraits/men/36.jpg"
  };
  
  const propertyDetails = {
    address: "123 Main Street, Anytown, CA 12345",
    purchasePrice: 450000,
    loanAmount: 360000,
    interestRate: 5.25,
    loanTerm: 30,
    estimatedValue: 480000
  };
  
  const loanComparison = {
    current: {
      monthlyPayment: 2550,
      interestRate: 6.75,
      remainingBalance: 375000,
      remainingTerm: 28
    },
    new: {
      monthlyPayment: 1988,
      interestRate: 5.25,
      loanAmount: 360000,
      term: 30
    },
    savings: {
      monthly: 562,
      lifetime: 202320
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-800">Your Mortgage Dashboard</h1>
      
      {/* Loan Benefits Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl text-blue-700">
            Your New Loan Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-lg font-semibold text-blue-700">Monthly Savings</div>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {formatCurrency(loanComparison.savings.monthly)}
              </div>
              <div className="text-sm text-gray-500 mt-1">per month</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-lg font-semibold text-blue-700">Interest Rate Reduction</div>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {(loanComparison.current.interestRate - loanComparison.new.interestRate).toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500 mt-1">lower than current</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-lg font-semibold text-blue-700">Lifetime Savings</div>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {formatCurrency(loanComparison.savings.lifetime)}
              </div>
              <div className="text-sm text-gray-500 mt-1">over loan term</div>
            </div>
          </div>
          
          <div className="mt-4 bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-medium text-blue-700 mb-3">Current vs. New Loan Comparison</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-sm font-medium"></div>
              <div className="text-sm font-medium text-blue-700">Current Loan</div>
              <div className="text-sm font-medium text-green-600">New Loan</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100">
              <div className="text-sm">Monthly Payment</div>
              <div className="text-sm">{formatCurrency(loanComparison.current.monthlyPayment)}</div>
              <div className="text-sm font-medium">{formatCurrency(loanComparison.new.monthlyPayment)}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100">
              <div className="text-sm">Interest Rate</div>
              <div className="text-sm">{loanComparison.current.interestRate}%</div>
              <div className="text-sm font-medium">{loanComparison.new.interestRate}%</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100">
              <div className="text-sm">Loan Amount</div>
              <div className="text-sm">{formatCurrency(loanComparison.current.remainingBalance)}</div>
              <div className="text-sm font-medium">{formatCurrency(loanComparison.new.loanAmount)}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 py-2">
              <div className="text-sm">Term</div>
              <div className="text-sm">{loanComparison.current.remainingTerm} years remaining</div>
              <div className="text-sm font-medium">{loanComparison.new.term} years</div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Property Information */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-blue-700">
              Your Home Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-500">Property Address</div>
                <div className="font-medium">{propertyDetails.address}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Estimated Value</div>
                  <div className="font-medium">{formatCurrency(propertyDetails.estimatedValue)}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-500">Loan Amount</div>
                  <div className="font-medium">{formatCurrency(propertyDetails.loanAmount)}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Loan to Value</div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">
                    {Math.round((propertyDetails.loanAmount / propertyDetails.estimatedValue) * 100)}%
                  </span>
                  <Progress 
                    value={(propertyDetails.loanAmount / propertyDetails.estimatedValue) * 100} 
                    className="h-2 flex-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Interest Rate</div>
                  <div className="font-medium">{propertyDetails.interestRate}%</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-500">Loan Term</div>
                  <div className="font-medium">{propertyDetails.loanTerm} years</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Loan Officer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-blue-700">
              Your Loan Officer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-4">
                <img 
                  src={loanOfficer.photo} 
                  alt={loanOfficer.name} 
                  className="h-16 w-16 rounded-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{loanOfficer.name}</h3>
                <p className="text-gray-600">Senior Loan Officer</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center">
                    <span className="text-gray-600 w-12">Email:</span>
                    <a href={`mailto:${loanOfficer.email}`} className="text-blue-600 hover:underline">
                      {loanOfficer.email}
                    </a>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-12">Phone:</span>
                    <a href={`tel:${loanOfficer.phone}`} className="text-blue-600 hover:underline">
                      {loanOfficer.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <h4 className="font-medium">Available Hours</h4>
              <p className="text-sm text-gray-600">
                Monday - Friday: 9:00 AM - 5:00 PM
              </p>
              <p className="text-sm text-gray-600">
                For urgent matters outside of business hours, please use the 24/7 Support chat.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientHome;
