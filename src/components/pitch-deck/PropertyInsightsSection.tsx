
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PaymentBreakdown {
  principal: number;
  interest: number;
  taxes: number;
  insurance: number;
}

interface PropertyInsightsSectionProps {
  propertyValue: number;
  loanBalance: number;
  monthlyPayment: number;
  paymentBreakdown: PaymentBreakdown;
}

const PropertyInsightsSection: React.FC<PropertyInsightsSectionProps> = ({
  propertyValue,
  loanBalance,
  monthlyPayment,
  paymentBreakdown,
}) => {
  // Calculate equity
  const equity = propertyValue - loanBalance;
  const equityPercentage = (equity / propertyValue) * 100;
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Prepare equity chart data
  const equityData = [
    { name: 'Loan Balance', value: loanBalance },
    { name: 'Equity', value: equity }
  ];
  
  const EQUITY_COLORS = ['#9b87f5', '#4ade80'];
  
  // Prepare payment breakdown chart data
  const paymentData = [
    { name: 'Principal', value: paymentBreakdown.principal },
    { name: 'Interest', value: paymentBreakdown.interest },
    { name: 'Taxes', value: paymentBreakdown.taxes },
    { name: 'Insurance', value: paymentBreakdown.insurance },
  ];
  
  const PAYMENT_COLORS = ['#4ade80', '#f97316', '#0ea5e9', '#8b5cf6'];

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-6">Your Current Home & Mortgage</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Property Value & Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Current Property Value</p>
                <p className="text-2xl font-bold">{formatCurrency(propertyValue)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Your Equity</p>
                <p className="text-2xl font-bold">{formatCurrency(equity)} <span className="text-sm text-green-600">({equityPercentage.toFixed(1)}%)</span></p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={equityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {equityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={EQUITY_COLORS[index % EQUITY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Current Monthly Payment: {formatCurrency(monthlyPayment)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              <div className="flex justify-between">
                <span>Principal & Interest:</span>
                <span>{formatCurrency(paymentBreakdown.principal + paymentBreakdown.interest)}</span>
              </div>
              <div className="flex justify-between">
                <span>Property Taxes:</span>
                <span>{formatCurrency(paymentBreakdown.taxes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Insurance:</span>
                <span>{formatCurrency(paymentBreakdown.insurance)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total Payment:</span>
                <span>{formatCurrency(monthlyPayment)}</span>
              </div>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PropertyInsightsSection;
