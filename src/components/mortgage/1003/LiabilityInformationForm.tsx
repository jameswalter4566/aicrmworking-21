
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Plus, CreditCard, File, Upload, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface LiabilityInformationFormProps {
  leadId: string;
  mortgageData?: any;
  onSave: (data: any) => void;
  isEditable?: boolean;
}

interface LiabilityEntry {
  id: string;
  liabilityType: string;
  accountNumber: string;
  balance: number;
  payment: number;
  creditor: string;
  dti: boolean;
  borrowerName?: string;
}

export const LiabilityInformationForm: React.FC<LiabilityInformationFormProps> = ({ 
  leadId, 
  mortgageData, 
  onSave,
  isEditable = true 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [liabilityEntries, setLiabilityEntries] = useState<LiabilityEntry[]>(
    mortgageData?.borrower?.liabilityEntries || []
  );
  const [selectedLiability, setSelectedLiability] = useState<LiabilityEntry | null>(null);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  
  const [currentEntry, setCurrentEntry] = useState<LiabilityEntry>({
    id: Date.now().toString(),
    liabilityType: "realEstate",
    accountNumber: "",
    balance: 0,
    payment: 0,
    creditor: "",
    dti: true
  });

  const handleAddNewLiability = () => {
    setSelectedLiability(null);
    setShowForm(true);
  };
  
  const handleSelectLiability = (liability: LiabilityEntry) => {
    setSelectedLiability(liability);
    setCurrentEntry(liability);
    setShowForm(true);
  };
  
  const handleSaveLiability = () => {
    let updatedEntries;
    
    if (selectedLiability) {
      // Update existing liability
      updatedEntries = liabilityEntries.map(entry => 
        entry.id === selectedLiability.id ? currentEntry : entry
      );
    } else {
      // Add new liability
      updatedEntries = [...liabilityEntries, currentEntry];
    }
    
    setLiabilityEntries(updatedEntries);
    
    // Reset form
    setCurrentEntry({
      id: Date.now().toString(),
      liabilityType: "realEstate",
      accountNumber: "",
      balance: 0,
      payment: 0,
      creditor: "",
      dti: true
    });
    
    setShowForm(false);
    setSelectedLiability(null);
    
    // Call the parent save handler
    onSave({
      section: 'liabilities',
      data: {
        borrower: {
          ...mortgageData?.borrower,
          liabilityEntries: updatedEntries
        }
      }
    });
  };
  
  const handleCancelForm = () => {
    setShowForm(false);
    setSelectedLiability(null);
  };
  
  const handleInputChange = (field: string, value: string | number | boolean) => {
    setCurrentEntry(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePdfDrop = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      
      setIsPdfUploading(true);
      
      // Simulate PDF processing
      setTimeout(() => {
        setIsPdfUploading(false);
        
        // Simulate found liabilities from PDF
        const mockLiabilities: LiabilityEntry[] = [
          {
            id: Date.now().toString(),
            liabilityType: "revolvingCharge",
            accountNumber: "XXXX-XXXX-XXXX-1234",
            balance: 5200,
            payment: 150,
            creditor: "Capital One",
            dti: true
          },
          {
            id: (Date.now() + 1).toString(),
            liabilityType: "installmentLoan",
            accountNumber: "LOAN12345",
            balance: 15000,
            payment: 350,
            creditor: "Wells Fargo",
            dti: true
          }
        ];
        
        setLiabilityEntries(prev => [...prev, ...mockLiabilities]);
        
        // Call the parent save handler
        onSave({
          section: 'liabilities',
          data: {
            borrower: {
              ...mortgageData?.borrower,
              liabilityEntries: [...liabilityEntries, ...mockLiabilities]
            }
          }
        });
        
        toast.success('Credit report analyzed! 2 liabilities found and added');
      }, 2000);
    }
  };

  const calculateTotalLiabilities = () => {
    return liabilityEntries.reduce((total, liability) => total + liability.balance, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getLiabilityTypeDisplay = (type: string) => {
    switch(type) {
      case "realEstate": return "Real Estate";
      case "installmentLoan": return "Installment Loan";
      case "revolvingCharge": return "Revolving Charge Account";
      case "autoLoan": return "Auto Loan";
      case "studentLoan": return "Student Loan";
      case "personalLoan": return "Personal Loan";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Liability Information</h3>
        {!showForm && (
          <Button 
            onClick={handleAddNewLiability} 
            disabled={!isEditable || showForm}
            className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Liability
          </Button>
        )}
      </div>

      <div className="bg-orange-50 rounded-lg p-4 my-4">
        <div className="flex items-center mb-4">
          <File className="h-6 w-6 text-orange-600 mr-2" />
          <h4 className="text-lg font-medium text-orange-800">AI Credit Analyzer</h4>
        </div>
        <p className="text-sm text-orange-700 mb-4">
          Upload your credit report PDF and our AI will automatically extract and add your liabilities.
        </p>
        <div className="flex items-center space-x-4">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-orange-300 rounded-lg cursor-pointer bg-orange-100 hover:bg-orange-200 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-3 text-orange-500" />
              <p className="mb-2 text-sm text-orange-700"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-orange-600">PDF files only</p>
            </div>
            <input 
              id="pdf-upload" 
              type="file" 
              className="hidden" 
              accept=".pdf"
              onChange={handlePdfDrop}
              disabled={!isEditable || isPdfUploading}
            />
          </label>
          {isPdfUploading && (
            <div className="flex items-center">
              <div className="animate-spin mr-2 h-5 w-5 text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <span className="text-orange-700">Analyzing your credit report...</span>
            </div>
          )}
        </div>
      </div>

      {liabilityEntries.length === 0 && !showForm ? (
        <div className="text-center py-8 border border-dashed rounded-md">
          <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No liability information has been added yet.</p>
          <Button 
            variant="outline" 
            onClick={handleAddNewLiability} 
            className="mt-2"
            disabled={!isEditable}
          >
            Add Liability
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-200">
              <TableRow>
                <TableHead className="w-1/6">LIABILITY TYPE</TableHead>
                <TableHead className="w-1/6">ACCOUNT NUMBER</TableHead>
                <TableHead className="w-1/6">BALANCE</TableHead>
                <TableHead className="w-1/6">PAYMENT</TableHead>
                <TableHead className="w-1/6">CREDITOR</TableHead>
                <TableHead className="w-1/6">DTI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liabilityEntries.map((entry) => (
                <TableRow 
                  key={entry.id} 
                  className="hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelectLiability(entry)}
                >
                  <TableCell>{getLiabilityTypeDisplay(entry.liabilityType)}</TableCell>
                  <TableCell>{entry.accountNumber}</TableCell>
                  <TableCell>{formatCurrency(entry.balance)}</TableCell>
                  <TableCell>{formatCurrency(entry.payment)}</TableCell>
                  <TableCell>{entry.creditor}</TableCell>
                  <TableCell>{entry.dti ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-orange-100 font-medium">
                <TableCell colSpan={2} className="text-right">TOTAL LIABILITIES</TableCell>
                <TableCell>{formatCurrency(calculateTotalLiabilities())}</TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {showForm && (
        <div className="border rounded-lg p-4 bg-white">
          <h4 className="text-lg font-medium mb-4 border-b pb-2">
            {selectedLiability ? 'Edit Liability Information' : 'Add Liability Information'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <Label htmlFor="liabilityType">Liability Type</Label>
              <Select 
                value={currentEntry.liabilityType}
                onValueChange={(value) => handleInputChange('liabilityType', value)}
                disabled={!isEditable}
              >
                <SelectTrigger id="liabilityType">
                  <SelectValue placeholder="Select Liability Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realEstate">Real Estate</SelectItem>
                  <SelectItem value="installmentLoan">Installment Loan</SelectItem>
                  <SelectItem value="revolvingCharge">Revolving Charge Account</SelectItem>
                  <SelectItem value="autoLoan">Auto Loan</SelectItem>
                  <SelectItem value="studentLoan">Student Loan</SelectItem>
                  <SelectItem value="personalLoan">Personal Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="borrowerName">Borrower Name</Label>
              <Input 
                id="borrowerName"
                value={currentEntry.borrowerName || ''}
                onChange={(e) => handleInputChange('borrowerName', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input 
                id="accountNumber"
                value={currentEntry.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="creditor">Creditor/Lender</Label>
              <Input 
                id="creditor"
                value={currentEntry.creditor}
                onChange={(e) => handleInputChange('creditor', e.target.value)}
                disabled={!isEditable}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-1">
              <Label htmlFor="balance">
                <DollarSign className="inline h-4 w-4 mr-1 opacity-70" />
                Balance
              </Label>
              <Input 
                id="balance"
                type="number"
                value={currentEntry.balance.toString()}
                onChange={(e) => handleInputChange('balance', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="payment">
                <DollarSign className="inline h-4 w-4 mr-1 opacity-70" />
                Monthly Payment
              </Label>
              <Input 
                id="payment"
                type="number"
                value={currentEntry.payment.toString()}
                onChange={(e) => handleInputChange('payment', parseFloat(e.target.value) || 0)}
                disabled={!isEditable}
              />
            </div>
            
            <div className="col-span-1 flex items-center mt-6">
              <input
                type="checkbox"
                id="dti"
                checked={currentEntry.dti}
                onChange={(e) => handleInputChange('dti', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-mortgage-purple focus:ring-mortgage-purple"
              />
              <Label htmlFor="dti" className="ml-2">Include in DTI Calculation</Label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancelForm} disabled={!isEditable}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveLiability} 
              disabled={!isEditable || !currentEntry.creditor}
              className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
            >
              {selectedLiability ? 'Update Liability' : 'Save Liability'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
