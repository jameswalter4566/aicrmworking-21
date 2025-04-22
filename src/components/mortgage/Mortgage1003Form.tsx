import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  UserCircle2, FileText, Briefcase, DollarSign, Building2, Clipboard
} from "lucide-react";
import { PersonalInfoForm } from "./1003/PersonalInfoForm";
import { EmploymentIncomeForm } from "./1003/EmploymentIncomeForm";
import { AssetInformationForm } from "./1003/AssetInformationForm";
import { LiabilityInformationForm } from "./1003/LiabilityInformationForm";
import { RealEstateOwnedForm } from "./1003/RealEstateOwnedForm";
import { LoanInformationForm } from "./1003/LoanInformationForm";
import { HousingExpensesForm } from "./1003/HousingExpensesForm";
import { leadProfileService } from "@/services/leadProfile";

interface Mortgage1003FormProps {
  lead: any;
  onSave: (section: string, data: Record<string, any>) => Promise<void>;
  isEditable?: boolean;
  isSaving?: boolean;
}

const Mortgage1003Form: React.FC<Mortgage1003FormProps> = ({ 
  lead, 
  onSave,
  isEditable = true,
  isSaving = false
}) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(false);
  
  const mortgageData = lead?.mortgageData || {};
  
  const checkForDocuments = () => {
    const documents = mortgageData.documents || 
                     (mortgageData.borrower?.data?.documents) || [];
    return documents.length > 0;
  };
  
  useEffect(() => {
    setHasDocuments(checkForDocuments());
    console.log("Mortgage data in 1003 Form:", mortgageData);
  }, [mortgageData]);
  
  const handleSaveSection = async (section: string, data: Record<string, any>) => {
    await onSave(section, data);
  };
  
  const handleConsolidateData = async () => {
    if (!lead?.id) return;
    
    try {
      setIsConsolidating(true);
      
      const result = await leadProfileService.consolidateMortgageData(lead.id);
      
      toast.success("Document data successfully consolidated", {
        description: `Processed ${result.processedDocuments?.length || 0} documents`
      });
    } catch (error) {
      console.error("Error consolidating data:", error);
      toast.error("Failed to consolidate document data");
    } finally {
      setIsConsolidating(false);
    }
  };
  
  const getDocumentsList = () => {
    return mortgageData.documents || 
          (mortgageData.borrower?.data?.documents) || [];
  };
  
  return (
    <Card id="mortgage1003Form">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-mortgage-purple" /> 
              Mortgage Application (Form 1003)
            </CardTitle>
            <CardDescription>
              Uniform Residential Loan Application
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-6">
            <TabsTrigger value="personal" className="flex gap-1">
              <UserCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="employment" className="flex gap-1">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Employment</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="liabilities" className="flex gap-1">
              <Clipboard className="h-4 w-4" />
              <span className="hidden sm:inline">Liabilities</span>
            </TabsTrigger>
            <TabsTrigger value="realestate" className="flex gap-1">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Real Estate</span>
            </TabsTrigger>
            <TabsTrigger value="housing" className="flex gap-1">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Housing</span>
            </TabsTrigger>
            <TabsTrigger value="loan" className="flex gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Loan</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <PersonalInfoForm 
              leadId={lead?.id}
              mortgageData={mortgageData}
              onSave={(data) => handleSaveSection("borrower", data)}
              isEditable={isEditable}
            />
          </TabsContent>
          
          <TabsContent value="employment">
            <EmploymentIncomeForm 
              leadId={lead?.id} 
              mortgageData={mortgageData}
              onSave={(data) => handleSaveSection("employment", data)}
              isEditable={isEditable}
            />
          </TabsContent>
          
          <TabsContent value="assets">
            <AssetInformationForm
              leadId={lead?.id}
              mortgageData={mortgageData}
              onSave={(data) => handleSaveSection("assets", data)}
              isEditable={isEditable}
            />
          </TabsContent>
          
          <TabsContent value="liabilities">
            <LiabilityInformationForm
              leadId={lead?.id}
              mortgageData={mortgageData}
              onSave={(data) => handleSaveSection("liabilities", data)}
              isEditable={isEditable}
            />
          </TabsContent>
          
          <TabsContent value="realestate">
            <RealEstateOwnedForm
              leadId={lead?.id}
              mortgageData={mortgageData}
              onSave={(data) => handleSaveSection("realestate", data)}
              isEditable={isEditable}
            />
          </TabsContent>
          
          <TabsContent value="housing">
            <HousingExpensesForm
              leadId={lead?.id}
              mortgageData={mortgageData}
              onSave={(data) => handleSaveSection("housing", data)}
              isEditable={isEditable}
            />
          </TabsContent>
          
          <TabsContent value="loan">
            <LoanInformationForm
              leadId={lead?.id}
              mortgageData={mortgageData}
              onSave={(data) => handleSaveSection("loan", data)}
              isEditable={isEditable}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Mortgage1003Form;
