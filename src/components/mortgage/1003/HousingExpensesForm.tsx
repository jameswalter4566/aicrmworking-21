
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, DollarSign, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface HousingExpensesFormProps {
  leadId: string;
  mortgageData?: any;
  onSave: (saveData: any) => Promise<void>;
  isEditable?: boolean;
}

export const HousingExpensesForm = ({
  leadId,
  mortgageData = {},
  onSave,
  isEditable = true,
}: HousingExpensesFormProps) => {
  const [activeTab, setActiveTab] = useState<string>("comparison");
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize form data from mortgageData or with default values
  const [presentExpenses, setPresentExpenses] = useState({
    monthlyRent: mortgageData?.housing?.present?.monthlyRent || "",
    mortgagePayment: mortgageData?.housing?.present?.mortgagePayment || "",
    otherFinancingPayment: mortgageData?.housing?.present?.otherFinancingPayment || "",
    hazardInsurance: mortgageData?.housing?.present?.hazardInsurance || "",
    monthlyTaxes: mortgageData?.housing?.present?.monthlyTaxes || "",
    monthlyMI: mortgageData?.housing?.present?.monthlyMI || "",
    monthlyHOADues: mortgageData?.housing?.present?.monthlyHOADues || "",
    floodInsurance: mortgageData?.housing?.present?.floodInsurance || "",
    monthlyOther: mortgageData?.housing?.present?.monthlyOther || "",
    totalAmount: mortgageData?.housing?.present?.totalAmount || "0.00",
  });
  
  const [proposedExpenses, setProposedExpenses] = useState({
    monthlyRent: mortgageData?.housing?.proposed?.monthlyRent || "",
    mortgagePayment: mortgageData?.housing?.proposed?.mortgagePayment || "",
    otherFinancingPayment: mortgageData?.housing?.proposed?.otherFinancingPayment || "",
    hazardInsurance: mortgageData?.housing?.proposed?.hazardInsurance || "",
    monthlyTaxes: mortgageData?.housing?.proposed?.monthlyTaxes || "",
    monthlyMI: mortgageData?.housing?.proposed?.monthlyMI || "",
    monthlyHOADues: mortgageData?.housing?.proposed?.monthlyHOADues || "",
    floodInsurance: mortgageData?.housing?.proposed?.floodInsurance || "",
    monthlyOther: mortgageData?.housing?.proposed?.monthlyOther || "",
    totalAmount: mortgageData?.housing?.proposed?.totalAmount || "0.00",
  });

  // Calculate total for present expenses
  useEffect(() => {
    const calculateTotal = () => {
      const fields = [
        "monthlyRent",
        "mortgagePayment",
        "otherFinancingPayment",
        "hazardInsurance",
        "monthlyTaxes",
        "monthlyMI",
        "monthlyHOADues",
        "floodInsurance",
        "monthlyOther",
      ];
      
      const total = fields.reduce((sum, field) => {
        const value = presentExpenses[field] === "" ? "0" : presentExpenses[field];
        return sum + parseFloat(value || "0");
      }, 0);
      
      setPresentExpenses(prev => ({
        ...prev,
        totalAmount: total.toFixed(2)
      }));
    };
    
    calculateTotal();
  }, [presentExpenses.monthlyRent, presentExpenses.mortgagePayment, 
      presentExpenses.otherFinancingPayment, presentExpenses.hazardInsurance,
      presentExpenses.monthlyTaxes, presentExpenses.monthlyMI,
      presentExpenses.monthlyHOADues, presentExpenses.floodInsurance,
      presentExpenses.monthlyOther]);
  
  // Calculate total for proposed expenses
  useEffect(() => {
    const calculateTotal = () => {
      const fields = [
        "monthlyRent",
        "mortgagePayment",
        "otherFinancingPayment",
        "hazardInsurance",
        "monthlyTaxes",
        "monthlyMI",
        "monthlyHOADues",
        "floodInsurance",
        "monthlyOther",
      ];
      
      const total = fields.reduce((sum, field) => {
        const value = proposedExpenses[field] === "" ? "0" : proposedExpenses[field];
        return sum + parseFloat(value || "0");
      }, 0);
      
      setProposedExpenses(prev => ({
        ...prev,
        totalAmount: total.toFixed(2)
      }));
    };
    
    calculateTotal();
  }, [proposedExpenses.monthlyRent, proposedExpenses.mortgagePayment, 
      proposedExpenses.otherFinancingPayment, proposedExpenses.hazardInsurance,
      proposedExpenses.monthlyTaxes, proposedExpenses.monthlyMI,
      proposedExpenses.monthlyHOADues, proposedExpenses.floodInsurance,
      proposedExpenses.monthlyOther]);

  // Handle present expenses form field changes
  const handlePresentChange = (field: string, value: string) => {
    setPresentExpenses(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle proposed expenses form field changes
  const handleProposedChange = (field: string, value: string) => {
    setProposedExpenses(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const housingData = {
        section: "housing",
        data: {
          housing: {
            present: presentExpenses,
            proposed: proposedExpenses
          }
        }
      };
      
      await onSave(housingData);
    } catch (error) {
      console.error("Error saving housing expenses:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderMoneyInput = (
    value: string, 
    onChange: (value: string) => void,
    disabled: boolean = false,
    readOnly: boolean = false,
    placeholder: string = "0.00"
  ) => {
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`pl-8 text-right bg-gray-100 ${readOnly ? 'bg-gray-200' : ''}`}
          disabled={disabled || isSaving}
          readOnly={readOnly}
          placeholder={placeholder}
        />
      </div>
    );
  };

  // Component for comparison view (both present and proposed expenses)
  const renderComparisonView = () => {
    return (
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div className="col-span-1"></div>
          <div className="col-span-1 text-center font-semibold text-orange-500">
            TOTAL PRESENT EXPENSE
          </div>
          <div className="col-span-1 text-center font-semibold text-orange-500">
            PROPOSED EXPENSE
          </div>
        </div>
        
        {/* Monthly Rent */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="py-2">Monthly Rent</Label>
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              presentExpenses.monthlyRent,
              (value) => handlePresentChange("monthlyRent", value),
              !isEditable
            )}
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              proposedExpenses.monthlyRent,
              (value) => handleProposedChange("monthlyRent", value),
              !isEditable
            )}
          </div>
        </div>
        
        {/* Mortgage Payment */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="py-2">Mortgage Payment</Label>
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              presentExpenses.mortgagePayment,
              (value) => handlePresentChange("mortgagePayment", value),
              !isEditable
            )}
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              proposedExpenses.mortgagePayment,
              (value) => handleProposedChange("mortgagePayment", value),
              !isEditable
            )}
          </div>
        </div>
        
        {/* Other Financing Payment */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="py-2">Other Financing Payment</Label>
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              presentExpenses.otherFinancingPayment,
              (value) => handlePresentChange("otherFinancingPayment", value),
              !isEditable
            )}
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              proposedExpenses.otherFinancingPayment,
              (value) => handleProposedChange("otherFinancingPayment", value),
              !isEditable
            )}
          </div>
        </div>
        
        {/* Hazard Insurance */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="py-2">Hazard Insurance</Label>
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              presentExpenses.hazardInsurance,
              (value) => handlePresentChange("hazardInsurance", value),
              !isEditable
            )}
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              proposedExpenses.hazardInsurance,
              (value) => handleProposedChange("hazardInsurance", value),
              !isEditable
            )}
          </div>
        </div>
        
        {/* Monthly Taxes */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="py-2">Monthly Taxes</Label>
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              presentExpenses.monthlyTaxes,
              (value) => handlePresentChange("monthlyTaxes", value),
              !isEditable
            )}
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              proposedExpenses.monthlyTaxes,
              (value) => handleProposedChange("monthlyTaxes", value),
              !isEditable
            )}
          </div>
        </div>
        
        {/* Monthly MI */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="py-2">Monthly MI</Label>
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              presentExpenses.monthlyMI,
              (value) => handlePresentChange("monthlyMI", value),
              !isEditable
            )}
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              proposedExpenses.monthlyMI,
              (value) => handleProposedChange("monthlyMI", value),
              !isEditable
            )}
          </div>
        </div>
        
        {/* Monthly HOA Dues */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="py-2">Monthly HOA Dues</Label>
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              presentExpenses.monthlyHOADues,
              (value) => handlePresentChange("monthlyHOADues", value),
              !isEditable
            )}
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              proposedExpenses.monthlyHOADues,
              (value) => handleProposedChange("monthlyHOADues", value),
              !isEditable
            )}
          </div>
        </div>
        
        {/* Flood Insurance */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="py-2">Flood Insurance</Label>
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              presentExpenses.floodInsurance,
              (value) => handlePresentChange("floodInsurance", value),
              !isEditable
            )}
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              proposedExpenses.floodInsurance,
              (value) => handleProposedChange("floodInsurance", value),
              !isEditable
            )}
          </div>
        </div>
        
        {/* Monthly Other */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="py-2">Monthly Other</Label>
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              presentExpenses.monthlyOther,
              (value) => handlePresentChange("monthlyOther", value),
              !isEditable
            )}
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              proposedExpenses.monthlyOther,
              (value) => handleProposedChange("monthlyOther", value),
              !isEditable
            )}
          </div>
        </div>
        
        <Separator className="my-4 border-t border-orange-300" />
        
        {/* Total Amount */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-1">
            <Label className="py-2 font-semibold">Total Amount</Label>
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              presentExpenses.totalAmount,
              () => {},
              true,
              true
            )}
          </div>
          <div className="col-span-1">
            {renderMoneyInput(
              proposedExpenses.totalAmount,
              () => {},
              true,
              true
            )}
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            disabled={!isEditable || isSaving}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-2xl px-6"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-800 mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                SAVE
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Render present expenses tab
  const renderPresentExpensesTab = () => {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {/* Monthly Rent */}
          <div className="mb-4">
            <Label htmlFor="monthlyRent" className="mb-2 block">Monthly Rent</Label>
            {renderMoneyInput(
              presentExpenses.monthlyRent,
              (value) => handlePresentChange("monthlyRent", value),
              !isEditable
            )}
          </div>
          
          {/* Mortgage Payment */}
          <div className="mb-4">
            <Label htmlFor="mortgagePayment" className="mb-2 block">Mortgage Payment</Label>
            {renderMoneyInput(
              presentExpenses.mortgagePayment,
              (value) => handlePresentChange("mortgagePayment", value),
              !isEditable
            )}
          </div>
          
          {/* Other Financing Payment */}
          <div className="mb-4">
            <Label htmlFor="otherFinancingPayment" className="mb-2 block">Other Financing Payment</Label>
            {renderMoneyInput(
              presentExpenses.otherFinancingPayment,
              (value) => handlePresentChange("otherFinancingPayment", value),
              !isEditable
            )}
          </div>
          
          {/* Hazard Insurance */}
          <div className="mb-4">
            <Label htmlFor="hazardInsurance" className="mb-2 block">Hazard Insurance</Label>
            {renderMoneyInput(
              presentExpenses.hazardInsurance,
              (value) => handlePresentChange("hazardInsurance", value),
              !isEditable
            )}
          </div>
          
          {/* Monthly Taxes */}
          <div className="mb-4">
            <Label htmlFor="monthlyTaxes" className="mb-2 block">Monthly Taxes</Label>
            {renderMoneyInput(
              presentExpenses.monthlyTaxes,
              (value) => handlePresentChange("monthlyTaxes", value),
              !isEditable
            )}
          </div>
          
          {/* Monthly MI */}
          <div className="mb-4">
            <Label htmlFor="monthlyMI" className="mb-2 block">Monthly MI</Label>
            {renderMoneyInput(
              presentExpenses.monthlyMI,
              (value) => handlePresentChange("monthlyMI", value),
              !isEditable
            )}
          </div>
          
          {/* Monthly HOA Dues */}
          <div className="mb-4">
            <Label htmlFor="monthlyHOADues" className="mb-2 block">Monthly HOA Dues</Label>
            {renderMoneyInput(
              presentExpenses.monthlyHOADues,
              (value) => handlePresentChange("monthlyHOADues", value),
              !isEditable
            )}
          </div>
          
          {/* Flood Insurance */}
          <div className="mb-4">
            <Label htmlFor="floodInsurance" className="mb-2 block">Flood Insurance</Label>
            {renderMoneyInput(
              presentExpenses.floodInsurance,
              (value) => handlePresentChange("floodInsurance", value),
              !isEditable
            )}
          </div>
          
          {/* Monthly Other */}
          <div className="mb-4">
            <Label htmlFor="monthlyOther" className="mb-2 block">Monthly Other</Label>
            {renderMoneyInput(
              presentExpenses.monthlyOther,
              (value) => handlePresentChange("monthlyOther", value),
              !isEditable
            )}
          </div>
          
          {/* Total Amount */}
          <div className="mb-4">
            <Label htmlFor="totalAmount" className="mb-2 block font-semibold">Total Amount</Label>
            {renderMoneyInput(
              presentExpenses.totalAmount,
              () => {},
              true,
              true
            )}
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            disabled={!isEditable || isSaving}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-2xl px-6"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-800 mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                SAVE
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Render proposed expenses tab
  const renderProposedExpensesTab = () => {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {/* Monthly Rent */}
          <div className="mb-4">
            <Label htmlFor="proposed-monthlyRent" className="mb-2 block">Monthly Rent</Label>
            {renderMoneyInput(
              proposedExpenses.monthlyRent,
              (value) => handleProposedChange("monthlyRent", value),
              !isEditable
            )}
          </div>
          
          {/* Mortgage Payment */}
          <div className="mb-4">
            <Label htmlFor="proposed-mortgagePayment" className="mb-2 block">Mortgage Payment</Label>
            {renderMoneyInput(
              proposedExpenses.mortgagePayment,
              (value) => handleProposedChange("mortgagePayment", value),
              !isEditable
            )}
          </div>
          
          {/* Other Financing Payment */}
          <div className="mb-4">
            <Label htmlFor="proposed-otherFinancingPayment" className="mb-2 block">Other Financing Payment</Label>
            {renderMoneyInput(
              proposedExpenses.otherFinancingPayment,
              (value) => handleProposedChange("otherFinancingPayment", value),
              !isEditable
            )}
          </div>
          
          {/* Hazard Insurance */}
          <div className="mb-4">
            <Label htmlFor="proposed-hazardInsurance" className="mb-2 block">Hazard Insurance</Label>
            {renderMoneyInput(
              proposedExpenses.hazardInsurance,
              (value) => handleProposedChange("hazardInsurance", value),
              !isEditable
            )}
          </div>
          
          {/* Monthly Taxes */}
          <div className="mb-4">
            <Label htmlFor="proposed-monthlyTaxes" className="mb-2 block">Monthly Taxes</Label>
            {renderMoneyInput(
              proposedExpenses.monthlyTaxes,
              (value) => handleProposedChange("monthlyTaxes", value),
              !isEditable
            )}
          </div>
          
          {/* Monthly MI */}
          <div className="mb-4">
            <Label htmlFor="proposed-monthlyMI" className="mb-2 block">Monthly MI</Label>
            {renderMoneyInput(
              proposedExpenses.monthlyMI,
              (value) => handleProposedChange("monthlyMI", value),
              !isEditable
            )}
          </div>
          
          {/* Monthly HOA Dues */}
          <div className="mb-4">
            <Label htmlFor="proposed-monthlyHOADues" className="mb-2 block">Monthly HOA Dues</Label>
            {renderMoneyInput(
              proposedExpenses.monthlyHOADues,
              (value) => handleProposedChange("monthlyHOADues", value),
              !isEditable
            )}
          </div>
          
          {/* Flood Insurance */}
          <div className="mb-4">
            <Label htmlFor="proposed-floodInsurance" className="mb-2 block">Flood Insurance</Label>
            {renderMoneyInput(
              proposedExpenses.floodInsurance,
              (value) => handleProposedChange("floodInsurance", value),
              !isEditable
            )}
          </div>
          
          {/* Monthly Other */}
          <div className="mb-4">
            <Label htmlFor="proposed-monthlyOther" className="mb-2 block">Monthly Other</Label>
            {renderMoneyInput(
              proposedExpenses.monthlyOther,
              (value) => handleProposedChange("monthlyOther", value),
              !isEditable
            )}
          </div>
          
          {/* Total Amount */}
          <div className="mb-4">
            <Label htmlFor="proposed-totalAmount" className="mb-2 block font-semibold">Total Amount</Label>
            {renderMoneyInput(
              proposedExpenses.totalAmount,
              () => {},
              true,
              true
            )}
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            disabled={!isEditable || isSaving}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-2xl px-6"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-800 mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                SAVE
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader className="bg-gray-100 border-b pb-2">
        <div className="flex justify-between items-center">
          <div className="w-32 text-center py-1 bg-blue-800 text-white font-semibold uppercase text-xs">
            Summary
          </div>
          <div className="flex-grow text-center text-sm font-medium">
            {mortgageData?.borrowers?.[0]?.firstName || ''} {mortgageData?.borrowers?.[0]?.lastName || ''}
            {mortgageData?.borrowers?.[1] && 
              ` & ${mortgageData?.borrowers?.[1]?.firstName || ''} ${mortgageData?.borrowers?.[1]?.lastName || ''}`}
          </div>
          <div className="w-32"></div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full border-b bg-gray-100">
            <TabsTrigger value="comparison" className="flex-1 uppercase font-semibold">
              Total vs. Proposed Expenses
            </TabsTrigger>
            <TabsTrigger value="present" className="flex-1 uppercase font-semibold">
              Present
            </TabsTrigger>
            <TabsTrigger value="proposed" className="flex-1 uppercase font-semibold">
              Proposed
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="comparison">
            {renderComparisonView()}
          </TabsContent>
          
          <TabsContent value="present">
            {renderPresentExpensesTab()}
          </TabsContent>
          
          <TabsContent value="proposed">
            {renderProposedExpensesTab()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
