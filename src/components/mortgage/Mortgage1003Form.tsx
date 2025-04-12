
import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  UserCircle2, FileText, Briefcase, DollarSign, Building2, Clipboard, 
  RefreshCw, Check, FileUp, AlertCircle
} from "lucide-react";
import { PersonalInfoForm } from "./1003/PersonalInfoForm";
import { EmploymentIncomeForm } from "./1003/EmploymentIncomeForm";
import { AssetInformationForm } from "./1003/AssetInformationForm";
import { LiabilityInformationForm } from "./1003/LiabilityInformationForm";
import { RealEstateOwnedForm } from "./1003/RealEstateOwnedForm";
import { LoanInformationForm } from "./1003/LoanInformationForm";
import { HousingExpensesForm } from "./1003/HousingExpensesForm";
import IntelligentFileUpload from "@/components/IntelligentFileUpload";
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
  
  // Get mortgage data or empty object if none exists
  const mortgageData = lead?.mortgageData || {};
  
  useEffect(() => {
    // Check if we have documents to consolidate
    const documents = mortgageData.documents || [];
    setHasDocuments(documents.length > 0);
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
          
          {hasDocuments && (
            <Button
              variant="outline"
              onClick={handleConsolidateData}
              disabled={isConsolidating || isSaving}
              className="flex items-center gap-2"
            >
              {isConsolidating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Consolidate Document Data
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {mortgageData.documents && mortgageData.documents.length > 0 && (
          <div className="bg-amber-50 p-4 rounded-lg mb-6 border border-amber-200">
            <div className="flex gap-3 mb-2">
              <FileUp className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium text-amber-800">Uploaded Documents</h3>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {mortgageData.documents.map((doc: any, index: number) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="bg-white border-amber-300 text-amber-800 flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" />
                  {doc.documentType || "Unknown Document"} 
                </Badge>
              ))}
            </div>
            
            <div className="mt-4 text-sm text-amber-700 flex gap-2 items-center">
              <AlertCircle className="h-4 w-4" />
              <span>
                Remember to click "Consolidate Document Data" after analyzing documents to merge the extracted information.
              </span>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <IntelligentFileUpload 
            uploadType="pdf" 
            endpoint="analyze-pdf-document" 
            entityId={lead?.id?.toString()}
            entityType="lead"
            successMessage="Document analyzed successfully"
            analyzeText="Analyze Document"
            uploadText="Upload & Analyze Document"
            onImportComplete={() => {}}
          />
        </div>
        
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
