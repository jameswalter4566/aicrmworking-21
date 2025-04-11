import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea'; // Added missing import

interface MortgageData {
  propertyValue?: number;
  currentLoan?: {
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
  proposedLoan?: {
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
  borrowerInfo?: {
    maritalStatus: string;
    subjectState: string;
    isForeverHome: string;
    currentRate: number;
    isInvestment: string;
  };
  monthlyHousingExpenses?: {
    rent: number;
    firstMortgage: number;
    otherFinancing: number;
    hazardInsurance: number;
    realEstateTaxes: number;
    mortgageInsurance: number;
    hoaDues: number;
    other: number;
    presentTotal: number;
    subjectPropTotal: number;
    proposedTotal: number;
  };
  grossMonthlyIncome?: {
    borrowerBase: number;
    coBorrowerBase: number;
    borrowerOvertime: number;
    coBorrowerOvertime: number;
    borrowerBonuses: number;
    coBorrowerBonuses: number;
    borrowerCommissions: number;
    coBorrowerCommissions: number;
    borrowerDividends: number;
    coBorrowerDividends: number;
    borrowerRentalIncome: number;
    coBorrowerRentalIncome: number;
    borrowerOther1: number;
    coBorrowerOther1: number;
    borrowerOther2: number;
    coBorrowerOther2: number;
    borrowerTotal: number;
    coBorrowerTotal: number;
    combinedTotal: number;
  };
  liabilities?: Array<{
    companyName: string;
    type: string;
    balance: number;
    payment: number;
    monthsLeft: number;
    isPaidOff: boolean;
  }>;
  transactionDetails?: {
    purchasePrice: number;
    alterations: number;
    land: number;
    refinance: number;
    prepaidItems: number;
    closingCosts: number;
    pmiMipFundingFee: number;
    discount: number;
    totalCosts: number;
    subordinateFinancing: number;
    sellerCredits: number;
    otherCredits: Array<{ // Fix: Define as array of objects with proper structure
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
  borrowerGoals?: {
    lowCostOption: string;
    rate: string;
    buydown: string;
    lowestRateAmount: number;
    lowCostAmount: number;
    currentOption: string;
  };
}

interface LoanInfoFormProps {
  mortgageData: MortgageData;
  onChange: (data: MortgageData) => void;
}

const LoanInfoForm: React.FC<LoanInfoFormProps> = ({ mortgageData, onChange }) => {
  const [activeTab, setActiveTab] = useState("basics");
  
  // Initialize default values if not provided
  useEffect(() => {
    const updatedData = { ...mortgageData };
    
    if (!mortgageData.borrowerInfo) {
      updatedData.borrowerInfo = {
        maritalStatus: '--Select--',
        subjectState: '',
        isForeverHome: '--Select--',
        currentRate: 3.75,
        isInvestment: '--Select--'
      };
    }
    
    if (!mortgageData.monthlyHousingExpenses) {
      updatedData.monthlyHousingExpenses = {
        rent: 0,
        firstMortgage: 0,
        otherFinancing: 0,
        hazardInsurance: 0,
        realEstateTaxes: 0,
        mortgageInsurance: 0,
        hoaDues: 0,
        other: 0,
        presentTotal: 0,
        subjectPropTotal: 0,
        proposedTotal: 0
      };
    }
    
    if (!mortgageData.grossMonthlyIncome) {
      updatedData.grossMonthlyIncome = {
        borrowerBase: 0,
        coBorrowerBase: 0,
        borrowerOvertime: 0,
        coBorrowerOvertime: 0,
        borrowerBonuses: 0,
        coBorrowerBonuses: 0,
        borrowerCommissions: 0,
        coBorrowerCommissions: 0,
        borrowerDividends: 0,
        coBorrowerDividends: 0,
        borrowerRentalIncome: 0,
        coBorrowerRentalIncome: 0,
        borrowerOther1: 0,
        coBorrowerOther1: 0,
        borrowerOther2: 0,
        coBorrowerOther2: 0,
        borrowerTotal: 0,
        coBorrowerTotal: 0,
        combinedTotal: 0
      };
    }
    
    if (!mortgageData.liabilities) {
      updatedData.liabilities = [];
    }
    
    if (!mortgageData.transactionDetails) {
      updatedData.transactionDetails = {
        purchasePrice: 0,
        alterations: 0,
        land: 0,
        refinance: 0,
        prepaidItems: 0,
        closingCosts: 0,
        pmiMipFundingFee: 0,
        discount: 0,
        totalCosts: 0,
        subordinateFinancing: 0,
        sellerCredits: 0,
        otherCredits: [], // Fix: Initialize as empty array of the correct shape
        loanAmount: 0,
        interestRate: 0,
        term: 30,
        pmiMipFinanced: 0,
        totalLoanAmount: 0,
        totalCredits: 0,
        cashFromBorrower: 0
      };
    }
    
    if (!mortgageData.borrowerGoals) {
      updatedData.borrowerGoals = {
        lowCostOption: '',
        rate: '',
        buydown: '',
        lowestRateAmount: 0,
        lowCostAmount: 0,
        currentOption: ''
      };
    }
    
    if (JSON.stringify(updatedData) !== JSON.stringify(mortgageData)) {
      onChange(updatedData);
    }
  }, []);

  // Handlers for updating different data sections
  const handleBasicChange = (field: keyof MortgageData['currentLoan'] | keyof MortgageData['proposedLoan'], section: 'currentLoan' | 'proposedLoan', value: any) => {
    const updated = { ...mortgageData };
    if (!updated[section]) {
      updated[section] = {} as any;
    }
    (updated[section] as any)[field] = parseFloat(value) || 0;
    onChange(updated);
  };
  
  const handleBorrowerInfoChange = (field: keyof MortgageData['borrowerInfo'], value: any) => {
    const updated = { ...mortgageData };
    if (!updated.borrowerInfo) {
      updated.borrowerInfo = {} as any;
    }
    updated.borrowerInfo[field] = field === 'currentRate' ? (parseFloat(value) || 0) : value;
    onChange(updated);
  };
  
  const handleMonthlyHousingChange = (field: keyof MortgageData['monthlyHousingExpenses'], value: any) => {
    const updated = { ...mortgageData };
    if (!updated.monthlyHousingExpenses) {
      updated.monthlyHousingExpenses = {} as any;
    }
    
    updated.monthlyHousingExpenses[field] = parseFloat(value) || 0;
    
    // Calculate totals
    if (field !== 'presentTotal' && field !== 'subjectPropTotal' && field !== 'proposedTotal') {
      // Recalculate total fields based on input changes
      const expenses = updated.monthlyHousingExpenses;
      expenses.presentTotal = (expenses.rent || 0) + (expenses.firstMortgage || 0) + (expenses.otherFinancing || 0) + 
                              (expenses.hazardInsurance || 0) + (expenses.realEstateTaxes || 0) + 
                              (expenses.mortgageInsurance || 0) + (expenses.hoaDues || 0) + (expenses.other || 0);
    }
    
    onChange(updated);
  };
  
  const handleIncomeChange = (field: keyof MortgageData['grossMonthlyIncome'], value: any) => {
    const updated = { ...mortgageData };
    if (!updated.grossMonthlyIncome) {
      updated.grossMonthlyIncome = {} as any;
    }
    
    updated.grossMonthlyIncome[field] = parseFloat(value) || 0;
    
    // Recalculate totals
    if (field !== 'borrowerTotal' && field !== 'coBorrowerTotal' && field !== 'combinedTotal') {
      const income = updated.grossMonthlyIncome;
      
      // Calculate borrower total
      income.borrowerTotal = (income.borrowerBase || 0) + (income.borrowerOvertime || 0) + 
                            (income.borrowerBonuses || 0) + (income.borrowerCommissions || 0) + 
                            (income.borrowerDividends || 0) + (income.borrowerRentalIncome || 0) + 
                            (income.borrowerOther1 || 0) + (income.borrowerOther2 || 0);
      
      // Calculate co-borrower total
      income.coBorrowerTotal = (income.coBorrowerBase || 0) + (income.coBorrowerOvertime || 0) + 
                              (income.coBorrowerBonuses || 0) + (income.coBorrowerCommissions || 0) + 
                              (income.coBorrowerDividends || 0) + (income.coBorrowerRentalIncome || 0) + 
                              (income.coBorrowerOther1 || 0) + (income.coBorrowerOther2 || 0);
      
      // Calculate combined total
      income.combinedTotal = income.borrowerTotal + income.coBorrowerTotal;
    }
    
    onChange(updated);
  };
  
  const handleAddLiability = () => {
    const updated = { ...mortgageData };
    if (!updated.liabilities) {
      updated.liabilities = [];
    }
    
    updated.liabilities.push({
      companyName: '',
      type: '',
      balance: 0,
      payment: 0,
      monthsLeft: 0,
      isPaidOff: false
    });
    
    onChange(updated);
  };
  
  const handleLiabilityChange = (index: number, field: keyof MortgageData['liabilities'][0], value: any) => {
    const updated = { ...mortgageData };
    if (!updated.liabilities) {
      updated.liabilities = [];
      return;
    }
    
    if (field === 'isPaidOff') {
      updated.liabilities[index][field] = value === 'true' || value === true;
    } else if (field === 'companyName' || field === 'type') {
      updated.liabilities[index][field] = value;
    } else {
      updated.liabilities[index][field] = parseFloat(value) || 0;
    }
    
    onChange(updated);
  };
  
  const handleRemoveLiability = (index: number) => {
    const updated = { ...mortgageData };
    if (!updated.liabilities) {
      return;
    }
    
    updated.liabilities.splice(index, 1);
    onChange(updated);
  };
  
  const handleTransactionChange = (field: keyof MortgageData['transactionDetails'], value: any) => {
    const updated = { ...mortgageData };
    if (!updated.transactionDetails) {
      updated.transactionDetails = {} as any;
    }
    
    updated.transactionDetails[field] = parseFloat(value) || 0;
    
    // Calculate totals
    const transaction = updated.transactionDetails;
    
    if (field !== 'totalCosts' && field !== 'totalCredits' && field !== 'cashFromBorrower' && field !== 'totalLoanAmount') {
      // Calculate total costs
      transaction.totalCosts = (transaction.purchasePrice || 0) + (transaction.alterations || 0) + 
                              (transaction.land || 0) + (transaction.refinance || 0) + 
                              (transaction.prepaidItems || 0) + (transaction.closingCosts || 0) + 
                              (transaction.pmiMipFundingFee || 0) + (transaction.discount || 0);
                              
      // Calculate total loan amount
      transaction.totalLoanAmount = (transaction.loanAmount || 0) + (transaction.pmiMipFinanced || 0);
      
      // Calculate total credits
      transaction.totalCredits = (transaction.subordinateFinancing || 0) + (transaction.sellerCredits || 0) + 
                                transaction.totalLoanAmount;
                                
      // Cash from borrower
      transaction.cashFromBorrower = transaction.totalCosts - transaction.totalCredits;
    }
    
    onChange(updated);
  };
  
  const handleBorrowerGoalsChange = (field: keyof MortgageData['borrowerGoals'], value: any) => {
    const updated = { ...mortgageData };
    if (!updated.borrowerGoals) {
      updated.borrowerGoals = {} as any;
    }
    
    if (field === 'lowestRateAmount' || field === 'lowCostAmount') {
      updated.borrowerGoals[field] = parseFloat(value) || 0;
    } else {
      updated.borrowerGoals[field] = value;
    }
    
    onChange(updated);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-5 mb-6 w-full">
        <TabsTrigger value="basics">Basic Loan Info</TabsTrigger>
        <TabsTrigger value="income">Income & Expenses</TabsTrigger>
        <TabsTrigger value="assets">Assets & Liabilities</TabsTrigger>
        <TabsTrigger value="transaction">Transaction Details</TabsTrigger>
        <TabsTrigger value="goals">Borrower Goals</TabsTrigger>
      </TabsList>

      {/* Basic Loan Information Tab */}
      <TabsContent value="basics" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Loan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Current Loan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Loan Balance</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={mortgageData.currentLoan?.balance || ''}
                    onChange={(e) => handleBasicChange('balance', 'currentLoan', e.target.value)}
                    className="pl-7"
                    placeholder="200,000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                <Input
                  type="number"
                  step="0.125"
                  value={mortgageData.currentLoan?.rate || ''}
                  onChange={(e) => handleBasicChange('rate', 'currentLoan', e.target.value)}
                  placeholder="4.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Term (Years)</label>
                <Input
                  type="number"
                  value={mortgageData.currentLoan?.term || ''}
                  onChange={(e) => handleBasicChange('term', 'currentLoan', e.target.value)}
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Type</label>
                <Input
                  type="text"
                  value={mortgageData.currentLoan?.type || ''}
                  onChange={(e) => handleBasicChange('type', 'currentLoan', e.target.value)}
                  placeholder="Conventional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Payment</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={mortgageData.currentLoan?.payment || ''}
                    onChange={(e) => handleBasicChange('payment', 'currentLoan', e.target.value)}
                    className="pl-7"
                    placeholder="1,200"
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proposed Loan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Proposed Loan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Loan Amount</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={mortgageData.proposedLoan?.amount || ''}
                    onChange={(e) => handleBasicChange('amount', 'proposedLoan', e.target.value)}
                    className="pl-7"
                    placeholder="200,000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                <Input
                  type="number"
                  step="0.125"
                  value={mortgageData.proposedLoan?.rate || ''}
                  onChange={(e) => handleBasicChange('rate', 'proposedLoan', e.target.value)}
                  placeholder="3.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Term (Years)</label>
                <Input
                  type="number"
                  value={mortgageData.proposedLoan?.term || ''}
                  onChange={(e) => handleBasicChange('term', 'proposedLoan', e.target.value)}
                  placeholder="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Type</label>
                <Input
                  type="text"
                  value={mortgageData.proposedLoan?.type || ''}
                  onChange={(e) => handleBasicChange('type', 'proposedLoan', e.target.value)}
                  placeholder="Conventional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Payment</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={mortgageData.proposedLoan?.payment || ''}
                    onChange={(e) => handleBasicChange('payment', 'proposedLoan', e.target.value)}
                    className="pl-7"
                    placeholder="950"
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Borrower Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Borrower Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Current Rate</label>
                <Input
                  type="number"
                  step="0.125"
                  value={mortgageData.borrowerInfo?.currentRate || '3.750'}
                  onChange={(e) => handleBorrowerInfoChange('currentRate', e.target.value)}
                  placeholder="3.750"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Marital Status</label>
                <Select 
                  value={mortgageData.borrowerInfo?.maritalStatus || '--Select--'} 
                  onValueChange={(value) => handleBorrowerInfoChange('maritalStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="--Select--" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="--Select--">--Select--</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Unmarried">Unmarried</SelectItem>
                    <SelectItem value="Separated">Separated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Is Forever Home?</label>
                <Select 
                  value={mortgageData.borrowerInfo?.isForeverHome || '--Select--'} 
                  onValueChange={(value) => handleBorrowerInfoChange('isForeverHome', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="--Select--" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="--Select--">--Select--</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Is Investment Property?</label>
                <Select 
                  value={mortgageData.borrowerInfo?.isInvestment || '--Select--'} 
                  onValueChange={(value) => handleBorrowerInfoChange('isInvestment', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="--Select--" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="--Select--">--Select--</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject Property State</label>
                <Input
                  type="text"
                  value={mortgageData.borrowerInfo?.subjectState || ''}
                  onChange={(e) => handleBorrowerInfoChange('subjectState', e.target.value)}
                  placeholder="CA"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Monthly Income and Housing Expenses Tab */}
      <TabsContent value="income" className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">V. Monthly Income and Combined Housing Expense Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Housing Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Housing Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expense</TableHead>
                      <TableHead className="text-right">Present</TableHead>
                      <TableHead className="text-right">Subject Prop.</TableHead>
                      <TableHead className="text-right">Proposed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Rent</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.monthlyHousingExpenses?.rent || ''} 
                          onChange={(e) => handleMonthlyHousingChange('rent', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>First Mortgage</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.monthlyHousingExpenses?.firstMortgage || ''} 
                          onChange={(e) => handleMonthlyHousingChange('firstMortgage', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">#NUM!</TableCell>
                      <TableCell className="text-right">
                        {mortgageData.proposedLoan?.payment || 0}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Other Financing</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.monthlyHousingExpenses?.otherFinancing || ''} 
                          onChange={(e) => handleMonthlyHousingChange('otherFinancing', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Hazard Insurance</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.monthlyHousingExpenses?.hazardInsurance || ''} 
                          onChange={(e) => handleMonthlyHousingChange('hazardInsurance', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Real Estate Taxes</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.monthlyHousingExpenses?.realEstateTaxes || ''} 
                          onChange={(e) => handleMonthlyHousingChange('realEstateTaxes', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Mortgage Insurance</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.monthlyHousingExpenses?.mortgageInsurance || ''} 
                          onChange={(e) => handleMonthlyHousingChange('mortgageInsurance', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>HOA Dues</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.monthlyHousingExpenses?.hoaDues || ''} 
                          onChange={(e) => handleMonthlyHousingChange('hoaDues', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Other</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.monthlyHousingExpenses?.other || ''} 
                          onChange={(e) => handleMonthlyHousingChange('other', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                    <TableRow className="font-medium">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">${mortgageData.monthlyHousingExpenses?.presentTotal || 0}</TableCell>
                      <TableCell className="text-right">${mortgageData.monthlyHousingExpenses?.subjectPropTotal || 0}</TableCell>
                      <TableCell className="text-right">${mortgageData.proposedLoan?.payment || 0}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Gross Monthly Income */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gross Monthly Income</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Income Source</TableHead>
                      <TableHead className="text-right">Borrower</TableHead>
                      <TableHead className="text-right">Co-Borrower</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Base</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.borrowerBase || ''} 
                          onChange={(e) => handleIncomeChange('borrowerBase', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.coBorrowerBase || ''} 
                          onChange={(e) => handleIncomeChange('coBorrowerBase', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        ${(mortgageData.grossMonthlyIncome?.borrowerBase || 0) + (mortgageData.grossMonthlyIncome?.coBorrowerBase || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Overtime</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.borrowerOvertime || ''} 
                          onChange={(e) => handleIncomeChange('borrowerOvertime', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.coBorrowerOvertime || ''} 
                          onChange={(e) => handleIncomeChange('coBorrowerOvertime', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        ${(mortgageData.grossMonthlyIncome?.borrowerOvertime || 0) + (mortgageData.grossMonthlyIncome?.coBorrowerOvertime || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Bonuses</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.borrowerBonuses || ''} 
                          onChange={(e) => handleIncomeChange('borrowerBonuses', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.coBorrowerBonuses || ''} 
                          onChange={(e) => handleIncomeChange('coBorrowerBonuses', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="
