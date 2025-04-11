
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
        otherCredits: [],
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
                      <TableCell className="text-right">
                        ${(mortgageData.grossMonthlyIncome?.borrowerBonuses || 0) + (mortgageData.grossMonthlyIncome?.coBorrowerBonuses || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Commissions</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.borrowerCommissions || ''} 
                          onChange={(e) => handleIncomeChange('borrowerCommissions', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.coBorrowerCommissions || ''} 
                          onChange={(e) => handleIncomeChange('coBorrowerCommissions', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        ${(mortgageData.grossMonthlyIncome?.borrowerCommissions || 0) + (mortgageData.grossMonthlyIncome?.coBorrowerCommissions || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Dividends/Interest</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.borrowerDividends || ''} 
                          onChange={(e) => handleIncomeChange('borrowerDividends', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.coBorrowerDividends || ''} 
                          onChange={(e) => handleIncomeChange('coBorrowerDividends', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        ${(mortgageData.grossMonthlyIncome?.borrowerDividends || 0) + (mortgageData.grossMonthlyIncome?.coBorrowerDividends || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Net Rental Income</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.borrowerRentalIncome || ''} 
                          onChange={(e) => handleIncomeChange('borrowerRentalIncome', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.coBorrowerRentalIncome || ''} 
                          onChange={(e) => handleIncomeChange('coBorrowerRentalIncome', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        ${(mortgageData.grossMonthlyIncome?.borrowerRentalIncome || 0) + (mortgageData.grossMonthlyIncome?.coBorrowerRentalIncome || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Other Income 1</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.borrowerOther1 || ''} 
                          onChange={(e) => handleIncomeChange('borrowerOther1', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.coBorrowerOther1 || ''} 
                          onChange={(e) => handleIncomeChange('coBorrowerOther1', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        ${(mortgageData.grossMonthlyIncome?.borrowerOther1 || 0) + (mortgageData.grossMonthlyIncome?.coBorrowerOther1 || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Other Income 2</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.borrowerOther2 || ''} 
                          onChange={(e) => handleIncomeChange('borrowerOther2', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={mortgageData.grossMonthlyIncome?.coBorrowerOther2 || ''} 
                          onChange={(e) => handleIncomeChange('coBorrowerOther2', e.target.value)}
                          className="w-24 ml-auto text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        ${(mortgageData.grossMonthlyIncome?.borrowerOther2 || 0) + (mortgageData.grossMonthlyIncome?.coBorrowerOther2 || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-medium">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">${mortgageData.grossMonthlyIncome?.borrowerTotal || 0}</TableCell>
                      <TableCell className="text-right">${mortgageData.grossMonthlyIncome?.coBorrowerTotal || 0}</TableCell>
                      <TableCell className="text-right">${mortgageData.grossMonthlyIncome?.combinedTotal || 0}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* Assets and Liabilities Tab */}
      <TabsContent value="assets" className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">VI. Assets and Liabilities</h3>
          
          {/* Liabilities */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Liabilities</CardTitle>
              <Button size="sm" onClick={handleAddLiability} variant="outline" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Liability
              </Button>
            </CardHeader>
            <CardContent>
              {mortgageData.liabilities && mortgageData.liabilities.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Payment</TableHead>
                      <TableHead className="text-right">Months Left</TableHead>
                      <TableHead className="text-center">Paid Off</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mortgageData.liabilities.map((liability, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input 
                            type="text" 
                            value={liability.companyName || ''} 
                            onChange={(e) => handleLiabilityChange(index, 'companyName', e.target.value)}
                            placeholder="First Mortgage"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="text" 
                            value={liability.type || ''} 
                            onChange={(e) => handleLiabilityChange(index, 'type', e.target.value)}
                            placeholder="Mortgage"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            type="number" 
                            value={liability.balance || ''} 
                            onChange={(e) => handleLiabilityChange(index, 'balance', e.target.value)}
                            className="text-right"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            type="number" 
                            value={liability.payment || ''} 
                            onChange={(e) => handleLiabilityChange(index, 'payment', e.target.value)}
                            className="text-right"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            type="number" 
                            value={liability.monthsLeft || ''} 
                            onChange={(e) => handleLiabilityChange(index, 'monthsLeft', e.target.value)}
                            className="text-right"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Select 
                            value={liability.isPaidOff ? "true" : "false"} 
                            onValueChange={(value) => handleLiabilityChange(index, 'isPaidOff', value)}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Paid Off</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleRemoveLiability(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium">
                      <TableCell colSpan={2} className="text-right">Total Liabilities:</TableCell>
                      <TableCell className="text-right">
                        ${mortgageData.liabilities.reduce((sum, item) => sum + (item.balance || 0), 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        Total Pmts: ${mortgageData.liabilities.reduce((sum, item) => sum + (item.payment || 0), 0)}
                      </TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No liabilities added yet. Click "Add Liability" to begin.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Transaction Details Tab */}
      <TabsContent value="transaction" className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">VII. Details of Transaction</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Details Left Column */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">a. Purchase Price</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.purchasePrice || ''} 
                      onChange={(e) => handleTransactionChange('purchasePrice', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">b. Alterations</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.alterations || ''} 
                      onChange={(e) => handleTransactionChange('alterations', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">c. Land</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.land || ''} 
                      onChange={(e) => handleTransactionChange('land', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">d. Refinance</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.refinance || ''} 
                      onChange={(e) => handleTransactionChange('refinance', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">e. Estimated prepaid items</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.prepaidItems || ''} 
                      onChange={(e) => handleTransactionChange('prepaidItems', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">f. Estimated closing costs</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.closingCosts || ''} 
                      onChange={(e) => handleTransactionChange('closingCosts', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">g. PMI, MIP, Funding Fee</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.pmiMipFundingFee || ''} 
                      onChange={(e) => handleTransactionChange('pmiMipFundingFee', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">h. Discount (if Borrower will pay)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.discount || ''} 
                      onChange={(e) => handleTransactionChange('discount', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <label className="block text-sm font-semibold mb-1">i. Total Costs (a through h)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.totalCosts || ''} 
                      className="pl-7 font-semibold"
                      readOnly
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Transaction Details Right Column */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Credits & Loan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">j. Subordinate Financing</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.subordinateFinancing || ''} 
                      onChange={(e) => handleTransactionChange('subordinateFinancing', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">k. Closing Costs Paid by Seller</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.sellerCredits || ''} 
                      onChange={(e) => handleTransactionChange('sellerCredits', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <Separator className="my-2" />
                
                <div>
                  <label className="block text-sm font-medium mb-1">m. Loan Amount</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.loanAmount || ''} 
                      onChange={(e) => handleTransactionChange('loanAmount', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interest Rate</label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="0.125"
                      value={mortgageData.transactionDetails?.interestRate || ''} 
                      onChange={(e) => handleTransactionChange('interestRate', e.target.value)}
                      placeholder="0"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Term (years)</label>
                  <Input 
                    type="number" 
                    value={mortgageData.transactionDetails?.term || ''} 
                    onChange={(e) => handleTransactionChange('term', e.target.value)}
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">n. PMI, MIP Financed</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.pmiMipFinanced || ''} 
                      onChange={(e) => handleTransactionChange('pmiMipFinanced', e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">o. Loan Amount (m + n)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.totalLoanAmount || ''} 
                      className="pl-7 font-semibold"
                      readOnly
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Total Credits (j through n)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.totalCredits || ''} 
                      className="pl-7 font-semibold"
                      readOnly
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Cash from borrower</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                    <Input 
                      type="number" 
                      value={mortgageData.transactionDetails?.cashFromBorrower || ''} 
                      className="pl-7 font-semibold"
                      readOnly
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* Borrower Goals Tab */}
      <TabsContent value="goals" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Borrower Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Low Cost Option</label>
                <Textarea 
                  value={mortgageData.borrowerGoals?.lowCostOption || ''} 
                  onChange={(e) => handleBorrowerGoalsChange('lowCostOption', e.target.value)}
                  placeholder="Enter borrower's low cost option goals..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rate</label>
                <Textarea 
                  value={mortgageData.borrowerGoals?.rate || ''} 
                  onChange={(e) => handleBorrowerGoalsChange('rate', e.target.value)}
                  placeholder="Enter borrower's rate goals..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Buydown</label>
                <Textarea 
                  value={mortgageData.borrowerGoals?.buydown || ''} 
                  onChange={(e) => handleBorrowerGoalsChange('buydown', e.target.value)}
                  placeholder="Enter borrower's buydown preferences..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Option</label>
                <Textarea 
                  value={mortgageData.borrowerGoals?.currentOption || ''} 
                  onChange={(e) => handleBorrowerGoalsChange('currentOption', e.target.value)}
                  placeholder="Enter details about borrower's current mortgage..."
                  rows={3}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium mb-1">Lowest Rate Amount</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input 
                    type="number" 
                    value={mortgageData.borrowerGoals?.lowestRateAmount || ''} 
                    onChange={(e) => handleBorrowerGoalsChange('lowestRateAmount', e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Low Cost Amount</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                  <Input 
                    type="number" 
                    value={mortgageData.borrowerGoals?.lowCostAmount || ''} 
                    onChange={(e) => handleBorrowerGoalsChange('lowCostAmount', e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default LoanInfoForm;
