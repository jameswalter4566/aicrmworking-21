import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface MortgageDetailedData {
  basicInfo?: {
    propertyValue: number;
    currentLoan: {
      balance: number;
      rate: number;
      payment: number;
      term: number;
      type: string;
      paymentBreakdown?: {
        principal: number;
        interest: number;
        taxes: number;
        insurance: number;
      };
    };
    proposedLoan: {
      amount: number;
      rate: number;
      payment: number;
      term: number;
      type: string;
      paymentBreakdown?: {
        principal: number;
        interest: number;
        taxes: number;
        insurance: number;
      };
    };
    savings?: {
      monthly: number;
      lifetime: number;
    };
  };
  monthlyIncome?: {
    borrower: {
      base: number;
      overtime: number;
      bonuses: number;
      commissions: number;
      dividendInterest: number;
      netRentalIncome: number;
      other1: number;
      other2: number;
      total: number;
    };
    coBorrower: {
      base: number;
      overtime: number;
      bonuses: number;
      commissions: number;
      dividendInterest: number;
      netRentalIncome: number;
      other1: number;
      other2: number;
      total: number;
    };
    combinedTotal: number;
  };
  housingExpenses?: {
    isInvestment: string;
    maritalStatus: string;
    foreverHome: string;
    propertyState: string;
    present: {
      rent: number;
      firstMortgage: number;
      otherFinancing: number;
      hazardInsurance: number;
      realEstateTaxes: number;
      mortgageInsurance: number;
      hoaDues: number;
      other: number;
      total: number;
    };
    proposed: {
      rent: number;
      firstMortgage: number;
      otherFinancing: number;
      hazardInsurance: number;
      realEstateTaxes: number;
      mortgageInsurance: number;
      hoaDues: number;
      other: number;
      total: number;
    };
  };
  assetsLiabilities?: {
    liabilities: Array<{
      company: string;
      type: string;
      balance: number;
      payment: number;
      monthsLeft: number;
      isPaidOff: boolean;
    }>;
    totalLiabilities: number;
    totalPayments: number;
  };
  transactionDetails?: {
    purchase: {
      purchasePrice: number;
      alterations: number;
      land: number;
      refinance: number;
      estimatedPrepaidItems: number;
      estimatedClosingCosts: number;
      pmiMipFundingFee: number;
      discount: number;
      totalCosts: number;
    };
    financing: {
      subordinateFinancing: number;
      sellerCredits: number;
      otherCredits: Array<{
        description: string;
        amount: number;
      }>;
      loanAmount: number;
      interestRate: number;
      term: number;
      pmiMipFinanced: number;
      totalLoanAmount: number;
      totalCredits: number;
      cashFromBorrower: number;
    };
  };
  borrowerGoals?: {
    lowCostOption: string;
    ratePreference: string;
    buydown: string;
    lowestRateAmount: number;
    lowCostAmount: number;
  };
}

interface LoanInfoFormProps {
  mortgageData: MortgageDetailedData | null;
  onFieldChange: (section: string, field: string, value: any) => void;
}

const LoanInfoForm: React.FC<LoanInfoFormProps> = ({ mortgageData, onFieldChange }) => {
  const form = useForm();

  // Helper to safely get nested values
  const getValue = (path: string[], defaultValue: any = '') => {
    let value = mortgageData;
    for (const key of path) {
      if (!value || typeof value !== 'object') return defaultValue;
      value = value[key as keyof typeof value];
    }
    return value || defaultValue;
  };

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid grid-cols-5 mb-6">
        <TabsTrigger value="basic">Basic Loan Info</TabsTrigger>
        <TabsTrigger value="income">Income & Expenses</TabsTrigger>
        <TabsTrigger value="assets">Assets & Liabilities</TabsTrigger>
        <TabsTrigger value="transaction">Transaction Details</TabsTrigger>
        <TabsTrigger value="goals">Borrower Goals</TabsTrigger>
      </TabsList>

      <TabsContent value="basic">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Loan Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Current Loan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="propertyValue" className="block text-sm font-medium mb-1">Property Value</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input
                    id="propertyValue"
                    type="number"
                    value={getValue(['basicInfo', 'propertyValue'], '')}
                    onChange={(e) => onFieldChange('basicInfo', 'propertyValue', e.target.value)}
                    className="pl-7"
                    placeholder="500,000"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="currentBalance" className="block text-sm font-medium mb-1">Current Loan Balance</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input
                    id="currentBalance"
                    type="number"
                    value={getValue(['basicInfo', 'currentLoan', 'balance'], '')}
                    onChange={(e) => onFieldChange('basicInfo.currentLoan', 'balance', e.target.value)}
                    className="pl-7"
                    placeholder="400,000"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="currentRate" className="block text-sm font-medium mb-1">Current Interest Rate (%)</Label>
                <Input
                  id="currentRate"
                  type="number"
                  step="0.125"
                  value={getValue(['basicInfo', 'currentLoan', 'rate'], '')}
                  onChange={(e) => onFieldChange('basicInfo.currentLoan', 'rate', e.target.value)}
                  placeholder="4.5"
                />
              </div>
              
              <div>
                <Label htmlFor="currentTerm" className="block text-sm font-medium mb-1">Current Term (Years)</Label>
                <Input
                  id="currentTerm"
                  type="number"
                  value={getValue(['basicInfo', 'currentLoan', 'term'], '')}
                  onChange={(e) => onFieldChange('basicInfo.currentLoan', 'term', e.target.value)}
                  placeholder="30"
                />
              </div>
              
              <div>
                <Label htmlFor="currentType" className="block text-sm font-medium mb-1">Current Loan Type</Label>
                <Input
                  id="currentType"
                  type="text"
                  value={getValue(['basicInfo', 'currentLoan', 'type'], '')}
                  onChange={(e) => onFieldChange('basicInfo.currentLoan', 'type', e.target.value)}
                  placeholder="Conventional"
                />
              </div>
              
              <div>
                <Label htmlFor="currentPayment" className="block text-sm font-medium mb-1">Monthly Payment</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input
                    id="currentPayment"
                    type="number"
                    value={getValue(['basicInfo', 'currentLoan', 'payment'], '')}
                    onChange={(e) => onFieldChange('basicInfo.currentLoan', 'payment', e.target.value)}
                    className="pl-7"
                    placeholder="2,100"
                    disabled
                  />
                </div>
              </div>

              <Separator className="my-4" />
              
              <div>
                <Label className="block text-sm font-medium mb-1">Current Payment Breakdown</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="currentPrincipal" className="text-xs">Principal</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                      <Input
                        id="currentPrincipal"
                        type="number"
                        value={getValue(['basicInfo', 'currentLoan', 'paymentBreakdown', 'principal'], '')}
                        onChange={(e) => onFieldChange('basicInfo.currentLoan.paymentBreakdown', 'principal', e.target.value)}
                        className="pl-7 text-sm h-8"
                        placeholder="600"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="currentInterest" className="text-xs">Interest</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                      <Input
                        id="currentInterest"
                        type="number"
                        value={getValue(['basicInfo', 'currentLoan', 'paymentBreakdown', 'interest'], '')}
                        onChange={(e) => onFieldChange('basicInfo.currentLoan.paymentBreakdown', 'interest', e.target.value)}
                        className="pl-7 text-sm h-8"
                        placeholder="1,000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="currentTaxes" className="text-xs">Taxes</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                      <Input
                        id="currentTaxes"
                        type="number"
                        value={getValue(['basicInfo', 'currentLoan', 'paymentBreakdown', 'taxes'], '')}
                        onChange={(e) => onFieldChange('basicInfo.currentLoan.paymentBreakdown', 'taxes', e.target.value)}
                        className="pl-7 text-sm h-8"
                        placeholder="300"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="currentInsurance" className="text-xs">Insurance</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                      <Input
                        id="currentInsurance"
                        type="number"
                        value={getValue(['basicInfo', 'currentLoan', 'paymentBreakdown', 'insurance'], '')}
                        onChange={(e) => onFieldChange('basicInfo.currentLoan.paymentBreakdown', 'insurance', e.target.value)}
                        className="pl-7 text-sm h-8"
                        placeholder="200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proposed Loan Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Proposed Loan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="proposedAmount" className="block text-sm font-medium mb-1">Loan Amount</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input
                    id="proposedAmount"
                    type="number"
                    value={getValue(['basicInfo', 'proposedLoan', 'amount'], '')}
                    onChange={(e) => onFieldChange('basicInfo.proposedLoan', 'amount', e.target.value)}
                    className="pl-7"
                    placeholder="400,000"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="proposedRate" className="block text-sm font-medium mb-1">Interest Rate (%)</Label>
                <Input
                  id="proposedRate"
                  type="number"
                  step="0.125"
                  value={getValue(['basicInfo', 'proposedLoan', 'rate'], '')}
                  onChange={(e) => onFieldChange('basicInfo.proposedLoan', 'rate', e.target.value)}
                  placeholder="3.5"
                />
              </div>
              
              <div>
                <Label htmlFor="proposedTerm" className="block text-sm font-medium mb-1">Term (Years)</Label>
                <Input
                  id="proposedTerm"
                  type="number"
                  value={getValue(['basicInfo', 'proposedLoan', 'term'], '')}
                  onChange={(e) => onFieldChange('basicInfo.proposedLoan', 'term', e.target.value)}
                  placeholder="30"
                />
              </div>
              
              <div>
                <Label htmlFor="proposedType" className="block text-sm font-medium mb-1">Loan Type</Label>
                <Input
                  id="proposedType"
                  type="text"
                  value={getValue(['basicInfo', 'proposedLoan', 'type'], '')}
                  onChange={(e) => onFieldChange('basicInfo.proposedLoan', 'type', e.target.value)}
                  placeholder="Conventional"
                />
              </div>
              
              <div>
                <Label htmlFor="proposedPayment" className="block text-sm font-medium mb-1">Monthly Payment</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input
                    id="proposedPayment"
                    type="number"
                    value={getValue(['basicInfo', 'proposedLoan', 'payment'], '')}
                    onChange={(e) => onFieldChange('basicInfo.proposedLoan', 'payment', e.target.value)}
                    className="pl-7"
                    placeholder="1,800"
                    disabled
                  />
                </div>
              </div>

              <Separator className="my-4" />
              
              <div>
                <Label className="block text-sm font-medium mb-1">Proposed Payment Breakdown</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="proposedPrincipal" className="text-xs">Principal</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                      <Input
                        id="proposedPrincipal"
                        type="number"
                        value={getValue(['basicInfo', 'proposedLoan', 'paymentBreakdown', 'principal'], '')}
                        onChange={(e) => onFieldChange('basicInfo.proposedLoan.paymentBreakdown', 'principal', e.target.value)}
                        className="pl-7 text-sm h-8"
                        placeholder="700"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="proposedInterest" className="text-xs">Interest</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                      <Input
                        id="proposedInterest"
                        type="number"
                        value={getValue(['basicInfo', 'proposedLoan', 'paymentBreakdown', 'interest'], '')}
                        onChange={(e) => onFieldChange('basicInfo.proposedLoan.paymentBreakdown', 'interest', e.target.value)}
                        className="pl-7 text-sm h-8"
                        placeholder="600"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="proposedTaxes" className="text-xs">Taxes</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                      <Input
                        id="proposedTaxes"
                        type="number"
                        value={getValue(['basicInfo', 'proposedLoan', 'paymentBreakdown', 'taxes'], '')}
                        onChange={(e) => onFieldChange('basicInfo.proposedLoan.paymentBreakdown', 'taxes', e.target.value)}
                        className="pl-7 text-sm h-8"
                        placeholder="300"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="proposedInsurance" className="text-xs">Insurance</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                      <Input
                        id="proposedInsurance"
                        type="number"
                        value={getValue(['basicInfo', 'proposedLoan', 'paymentBreakdown', 'insurance'], '')}
                        onChange={(e) => onFieldChange('basicInfo.proposedLoan.paymentBreakdown', 'insurance', e.target.value)}
                        className="pl-7 text-sm h-8"
                        placeholder="200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="income">
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Income & Housing Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Income Section */}
                <div className="space-y-4">
                  <h3 className="font-medium text-base">Gross Monthly Income</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <Label className="text-sm">&nbsp;</Label>
                    </div>
                    <div className="col-span-1">
                      <Label htmlFor="borrowerBase" className="text-sm">Borrower</Label>
                    </div>
                    <div className="col-span-1">
                      <Label htmlFor="coBorrowerBase" className="text-sm">Co-Borrower</Label>
                    </div>
                    
                    {/* Base Income */}
                    <div className="col-span-1">
                      <Label htmlFor="base" className="text-sm">Base</Label>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="borrowerBase"
                          type="number"
                          value={getValue(['monthlyIncome', 'borrower', 'base'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.borrower', 'base', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="5,000"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="coBorrowerBase"
                          type="number"
                          value={getValue(['monthlyIncome', 'coBorrower', 'base'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.coBorrower', 'base', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="4,000"
                        />
                      </div>
                    </div>
                    
                    {/* Overtime */}
                    <div className="col-span-1">
                      <Label htmlFor="overtime" className="text-sm">Overtime</Label>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="borrowerOvertime"
                          type="number"
                          value={getValue(['monthlyIncome', 'borrower', 'overtime'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.borrower', 'overtime', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="500"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="coBorrowerOvertime"
                          type="number"
                          value={getValue(['monthlyIncome', 'coBorrower', 'overtime'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.coBorrower', 'overtime', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="200"
                        />
                      </div>
                    </div>
                    
                    {/* Bonuses */}
                    <div className="col-span-1">
                      <Label htmlFor="bonuses" className="text-sm">Bonuses</Label>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="borrowerBonuses"
                          type="number"
                          value={getValue(['monthlyIncome', 'borrower', 'bonuses'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.borrower', 'bonuses', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="1,000"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="coBorrowerBonuses"
                          type="number"
                          value={getValue(['monthlyIncome', 'coBorrower', 'bonuses'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.coBorrower', 'bonuses', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="500"
                        />
                      </div>
                    </div>
                    
                    {/* Commissions */}
                    <div className="col-span-1">
                      <Label htmlFor="commissions" className="text-sm">Commissions</Label>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="borrowerCommissions"
                          type="number"
                          value={getValue(['monthlyIncome', 'borrower', 'commissions'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.borrower', 'commissions', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="coBorrowerCommissions"
                          type="number"
                          value={getValue(['monthlyIncome', 'coBorrower', 'commissions'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.coBorrower', 'commissions', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    {/* Dividend/Interest */}
                    <div className="col-span-1">
                      <Label htmlFor="dividendInterest" className="text-sm">Div./Interest</Label>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="borrowerDividendInterest"
                          type="number"
                          value={getValue(['monthlyIncome', 'borrower', 'dividendInterest'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.borrower', 'dividendInterest', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="200"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="coBorrowerDividendInterest"
                          type="number"
                          value={getValue(['monthlyIncome', 'coBorrower', 'dividendInterest'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.coBorrower', 'dividendInterest', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="100"
                        />
                      </div>
                    </div>
                    
                    {/* Net Rental Income */}
                    <div className="col-span-1">
                      <Label htmlFor="netRentalIncome" className="text-sm">Net Rent Inc.</Label>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="borrowerNetRentalIncome"
                          type="number"
                          value={getValue(['monthlyIncome', 'borrower', 'netRentalIncome'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.borrower', 'netRentalIncome', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="coBorrowerNetRentalIncome"
                          type="number"
                          value={getValue(['monthlyIncome', 'coBorrower', 'netRentalIncome'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.coBorrower', 'netRentalIncome', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    {/* Other 1 */}
                    <div className="col-span-1">
                      <Label htmlFor="other1" className="text-sm">Other</Label>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="borrowerOther1"
                          type="number"
                          value={getValue(['monthlyIncome', 'borrower', 'other1'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.borrower', 'other1', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="coBorrowerOther1"
                          type="number"
                          value={getValue(['monthlyIncome', 'coBorrower', 'other1'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.coBorrower', 'other1', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    {/* Other 2 */}
                    <div className="col-span-1">
                      <Label htmlFor="other2" className="text-sm">Other</Label>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="borrowerOther2"
                          type="number"
                          value={getValue(['monthlyIncome', 'borrower', 'other2'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.borrower', 'other2', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="coBorrowerOther2"
                          type="number"
                          value={getValue(['monthlyIncome', 'coBorrower', 'other2'], '')}
                          onChange={(e) => onFieldChange('monthlyIncome.coBorrower', 'other2', e.target.value)}
                          className="pl-6 text-sm h-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    {/* Total Income - Result row */}
                    <div className="col-span-1">
                      <Label htmlFor="totalIncome" className="text-sm font-medium">Total</Label>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="borrowerTotal"
                          type="number"
                          value={getValue(['monthlyIncome', 'borrower', 'total'], '')}
                          className="pl-6 text-sm h-8 font-medium bg-gray-50"
                          placeholder="6,700"
                          disabled
                        />
                      </div>
                    </div>
                    <div className="col-span-1">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500">$</span>
                        <Input
                          id="coBorrowerTotal"
                          type="number"
                          value={getValue(['monthlyIncome', 'coBorrower', 'total'], '')}
                          className="pl-6 text-sm h-8 font-medium bg-gray-50"
                          placeholder="4,800"
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Label className="text-sm font-medium">Combined Total Monthly Income</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                      <Input
                        id="combinedTotal"
                        type="number"
                        value={getValue(['monthlyIncome', 'combinedTotal'], '')}
                        className="pl-7 font-medium bg-gray-50"
                        placeholder="11,500"
                        disabled
                      />
                    </div>
                  </div>
                </div>
                
                {/* Housing Expenses Section */}
                <div className="space-y-4">
                  <h3 className="font-medium text-base">Monthly Housing Expenses</h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3 grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="isInvestment" className="text-sm">Is Investment?</Label>
                        <Select
                          value={getValue(['housingExpenses', 'isInvestment'], '')}
                          onValueChange={(value) => onFieldChange('housingExpenses', 'isInvestment', value)}
                        >
                          <SelectTrigger id="isInvestment" className="text-sm">
                            <SelectValue placeholder="--Select--" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="maritalStatus" className="text-sm">Marital Status</Label>
                        <Select
                          value={getValue(['housingExpenses', 'maritalStatus'], '')}
                          onValueChange={(value) => onFieldChange('housingExpenses', 'maritalStatus', value)}
                        >
                          <SelectTrigger id="maritalStatus" className="text-sm">
                            <SelectValue placeholder="--Select--" />
                          </SelectTrigger>
