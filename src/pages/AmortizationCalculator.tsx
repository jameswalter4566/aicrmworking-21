
import React, { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Calculator } from "lucide-react";

const AmortizationCalculator = () => {
  const [loanAmount, setLoanAmount] = useState<number>(300000);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [loanTerm, setLoanTerm] = useState<number>(30);
  const [amortizationSchedule, setAmortizationSchedule] = useState<any[]>([]);

  const calculateAmortization = () => {
    const monthlyRate = interestRate / 100 / 12;
    const totalPayments = loanTerm * 12;
    const monthlyPayment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalPayments));
    
    let balance = loanAmount;
    const schedule = [];
    
    for (let i = 1; i <= Math.min(totalPayments, 360); i++) {
      const interest = balance * monthlyRate;
      const principalPayment = monthlyPayment - interest;
      balance -= principalPayment;
      
      if (i <= 12 || i % 12 === 0 || i === totalPayments) {
        schedule.push({
          payment: i,
          monthlyPayment: monthlyPayment.toFixed(2),
          principal: principalPayment.toFixed(2),
          interest: interest.toFixed(2),
          balance: Math.max(balance, 0).toFixed(2),
          year: Math.ceil(i / 12)
        });
      }
    }
    
    setAmortizationSchedule(schedule);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Receipt className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Amortization Calculator</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
            <CardDescription>
              Enter the loan details to calculate the amortization schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="loan-amount">Loan Amount: ${loanAmount.toLocaleString()}</Label>
                </div>
                <div className="flex items-center space-x-4">
                  <Slider 
                    id="loan-amount"
                    min={10000} 
                    max={1000000} 
                    step={5000} 
                    value={[loanAmount]} 
                    onValueChange={(value) => setLoanAmount(value[0])} 
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="interest-rate">Interest Rate: {interestRate}%</Label>
                </div>
                <div className="flex items-center space-x-4">
                  <Slider 
                    id="interest-rate"
                    min={0.5} 
                    max={10} 
                    step={0.125} 
                    value={[interestRate]} 
                    onValueChange={(value) => setInterestRate(value[0])} 
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    step={0.125}
                    className="w-24"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="loan-term">Loan Term: {loanTerm} years</Label>
                </div>
                <div className="flex items-center space-x-4">
                  <Slider 
                    id="loan-term"
                    min={5} 
                    max={30} 
                    step={5} 
                    value={[loanTerm]} 
                    onValueChange={(value) => setLoanTerm(value[0])} 
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              </div>
              
              <Button 
                onClick={calculateAmortization} 
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Amortization
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {amortizationSchedule.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Amortization Schedule</CardTitle>
              <CardDescription>
                Monthly payment: ${parseFloat(amortizationSchedule[0].monthlyPayment).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Monthly Payment</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Remaining Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amortizationSchedule.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.year}</TableCell>
                      <TableCell>{row.payment}</TableCell>
                      <TableCell>${parseFloat(row.monthlyPayment).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                      <TableCell>${parseFloat(row.principal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                      <TableCell>${parseFloat(row.interest).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                      <TableCell>${parseFloat(row.balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default AmortizationCalculator;
