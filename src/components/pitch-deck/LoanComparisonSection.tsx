
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface LoanDetails {
  balance: number;
  rate: number;
  payment: number;
  term: number;
  type: string;
  paymentBreakdown: {
    principal: number;
    interest: number;
    taxes: number;
    insurance: number;
  };
}

interface LoanComparisonSectionProps {
  currentLoan: LoanDetails;
  proposedLoan: LoanDetails;
  savings: {
    monthly: number;
    lifetime: number;
  };
}

const LoanComparisonSection: React.FC<LoanComparisonSectionProps> = ({
  currentLoan,
  proposedLoan,
  savings,
}) => {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(3)}%`;
  };
  
  // Prepare payment comparison data
  const paymentComparisonData = [
    {
      name: 'Total Payment',
      Current: currentLoan.payment,
      Proposed: proposedLoan.payment,
    },
    {
      name: 'Principal & Interest',
      Current: currentLoan.paymentBreakdown.principal + currentLoan.paymentBreakdown.interest,
      Proposed: proposedLoan.paymentBreakdown.principal + proposedLoan.paymentBreakdown.interest,
    },
    {
      name: 'Taxes',
      Current: currentLoan.paymentBreakdown.taxes,
      Proposed: proposedLoan.paymentBreakdown.taxes,
    },
    {
      name: 'Insurance',
      Current: currentLoan.paymentBreakdown.insurance,
      Proposed: proposedLoan.paymentBreakdown.insurance,
    },
  ];
  
  // Prepare interest rate comparison data
  const rateComparisonData = [
    {
      name: 'Interest Rate',
      Current: currentLoan.rate,
      Proposed: proposedLoan.rate,
    }
  ];

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-6">Compare Your Options</h2>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle>Current Loan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Balance:</span>
                <span className="font-medium">{formatCurrency(currentLoan.balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Interest Rate:</span>
                <span className="font-medium">{formatPercentage(currentLoan.rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Payment:</span>
                <span className="font-medium">{formatCurrency(currentLoan.payment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Term:</span>
                <span className="font-medium">{currentLoan.term} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Type:</span>
                <span className="font-medium">{currentLoan.type}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>Proposed Refinance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">New Loan Amount:</span>
                <span className="font-medium">{formatCurrency(proposedLoan.balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Interest Rate:</span>
                <span className="font-medium">{formatPercentage(proposedLoan.rate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Payment:</span>
                <span className="font-medium">{formatCurrency(proposedLoan.payment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Term:</span>
                <span className="font-medium">{proposedLoan.term} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Type:</span>
                <span className="font-medium">{proposedLoan.type}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Potential Savings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-100">
              <p className="text-lg text-gray-600 mb-2">Monthly Savings</p>
              <p className="text-4xl font-bold text-green-600">{formatCurrency(savings.monthly)}</p>
            </div>
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-100">
              <p className="text-lg text-gray-600 mb-2">Lifetime Savings</p>
              <p className="text-4xl font-bold text-green-600">{formatCurrency(savings.lifetime)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Monthly Payment Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={paymentComparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="Current" name="Current Loan" fill="#9b87f5" />
                <Bar dataKey="Proposed" name="Proposed Refinance" fill="#4ade80" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Interest Rate Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rateComparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
                <Bar dataKey="Current" name="Current Rate" fill="#f97316" />
                <Bar dataKey="Proposed" name="Proposed Rate" fill="#4ade80" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanComparisonSection;
