
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calculator, DollarSign, PercentIcon, CalendarIcon } from "lucide-react";
import { useIndustry } from "@/context/IndustryContext";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AmortizationEntry {
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

const AmortizationCalculator = () => {
  const navigate = useNavigate();
  const { activeIndustry } = useIndustry();
  const [loanAmount, setLoanAmount] = useState(300000);
  const [interestRate, setInterestRate] = useState(3.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [schedule, setSchedule] = useState<AmortizationEntry[]>([]);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // Redirect if not mortgage industry
  useEffect(() => {
    if (activeIndustry !== "mortgage") {
      navigate("/settings");
    }
  }, [activeIndustry, navigate]);

  // Calculate monthly payment
  const calculatePayment = () => {
    const principal = loanAmount;
    const monthlyInterest = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    
    const x = Math.pow(1 + monthlyInterest, numberOfPayments);
    const monthly = (principal * x * monthlyInterest) / (x - 1);
    
    setMonthlyPayment(monthly);
    generateAmortizationSchedule(principal, monthlyInterest, numberOfPayments, monthly);
  };

  // Generate amortization schedule
  const generateAmortizationSchedule = (
    principal: number, 
    monthlyInterest: number, 
    numberOfPayments: number, 
    monthlyPayment: number
  ) => {
    let balance = principal;
    const schedule: AmortizationEntry[] = [];
    
    for (let i = 1; i <= numberOfPayments; i++) {
      const interestPayment = balance * monthlyInterest;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;
      
      schedule.push({
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance),
      });
      
      // Only show first few entries by default
      if (i >= 24 && !showFullSchedule) break;
    }
    
    setSchedule(schedule);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Calculator className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Amortization Calculator</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Input Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
              <CardDescription>Enter your mortgage details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Loan Amount */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="loanAmount">Loan Amount</Label>
                  <span className="text-sm font-medium">{formatCurrency(loanAmount)}</span>
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="loanAmount"
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="pl-10"
                  />
                </div>
                <Slider
                  value={[loanAmount]}
                  min={50000}
                  max={1000000}
                  step={1000}
                  onValueChange={(value) => setLoanAmount(value[0])}
                />
              </div>

              {/* Interest Rate */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <span className="text-sm font-medium">{interestRate}%</span>
                </div>
                <div className="relative">
                  <PercentIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="pl-10"
                  />
                </div>
                <Slider
                  value={[interestRate]}
                  min={1}
                  max={10}
                  step={0.1}
                  onValueChange={(value) => setInterestRate(value[0])}
                />
              </div>

              {/* Loan Term */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="loanTerm">Loan Term (years)</Label>
                  <span className="text-sm font-medium">{loanTerm} years</span>
                </div>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="loanTerm"
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                    className="pl-10"
                  />
                </div>
                <Slider
                  value={[loanTerm]}
                  min={5}
                  max={30}
                  step={1}
                  onValueChange={(value) => setLoanTerm(value[0])}
                />
              </div>

              <Button onClick={calculatePayment} className="w-full bg-blue-500 hover:bg-blue-600">
                Calculate
              </Button>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Amortization Schedule</CardTitle>
              <CardDescription>
                {monthlyPayment > 0 ? (
                  <>Your estimated monthly payment is <span className="font-bold">{formatCurrency(monthlyPayment)}</span></>
                ) : (
                  "Enter loan details and click Calculate to see your amortization schedule"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedule.length > 0 ? (
                <>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Principal</TableHead>
                          <TableHead>Interest</TableHead>
                          <TableHead>Remaining Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedule.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{formatCurrency(entry.payment)}</TableCell>
                            <TableCell>{formatCurrency(entry.principal)}</TableCell>
                            <TableCell>{formatCurrency(entry.interest)}</TableCell>
                            <TableCell>{formatCurrency(entry.balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {loanTerm * 12 > 24 && (
                    <Button
                      variant="outline"
                      onClick={() => setShowFullSchedule(!showFullSchedule)}
                      className="mt-4"
                    >
                      {showFullSchedule ? "Show Less" : "Show Full Schedule"}
                    </Button>
                  )}
                </>
              ) : (
                <div className="h-40 flex items-center justify-center border rounded-md bg-gray-50">
                  <p className="text-gray-500">No data to display</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default AmortizationCalculator;
