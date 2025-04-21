import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoanApplicationSidebar from "@/components/mortgage/LoanApplicationSidebar";
import LoanProgressTracker from "@/components/mortgage/LoanProgressTracker";
import PDFDropZone from "@/components/mortgage/PDFDropZone";
import { PersonalInfoForm } from "@/components/mortgage/1003/PersonalInfoForm";
import { EmploymentIncomeForm } from "@/components/mortgage/1003/EmploymentIncomeForm";
import { AssetInformationForm } from "@/components/mortgage/1003/AssetInformationForm";
import { LiabilityInformationForm } from "@/components/mortgage/1003/LiabilityInformationForm";
import { RealEstateOwnedForm } from "@/components/mortgage/1003/RealEstateOwnedForm";
import { LoanInformationForm } from "@/components/mortgage/1003/LoanInformationForm";
import { HousingExpensesForm } from "@/components/mortgage/1003/HousingExpensesForm";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface LoanApplication {
  id: string;
  firstName: string;
  lastName: string;
  propertyAddress: string;
  loanAmount: number;
  loanStatus: string;
  loanId: string;
  mortgageData?: any;
  currentStep?: string;
}

const LoanApplicationViewer = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [loanApplication, setLoanApplication] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("1003-personal");
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (id) {
      fetchLoanApplicationData(id);
    }
  }, [id]);
  
  const fetchLoanApplicationData = async (leadId: string) => {
    setLoading(true);
    try {
      console.log("Fetching loan application data for ID:", leadId);
      const { data: response, error: profileError } = await supabase.functions.invoke('lead-profile', {
        body: { id: leadId }
      });

      if (profileError) {
        console.error("Error fetching loan application:", profileError);
        toast.error("Failed to load loan application details");
        setLoading(false);
        return;
      }

      if (!response.success || !response.data || !response.data.lead) {
        console.error("API returned error or no data:", response.error);
        toast.error(response.error || "Failed to load loan application details");
        setLoading(false);
        return;
      }

      const lead = response.data.lead;
      console.log("Retrieved complete lead data:", lead);
      
      const loanAmountStr = lead.mortgageData?.property?.loanAmount || '0';
      const loanAmount = parseFloat(loanAmountStr.replace(/,/g, '')) || 0;
      
      let currentStep = "applicationCreated"; // Default to first step
      
      if (lead.mortgageData?.loan?.status) {
        const status = lead.mortgageData.loan.status.toLowerCase();
        if (status.includes("processing")) currentStep = "processing";
        else if (status.includes("approved")) currentStep = "approved";
        else if (status.includes("closing")) currentStep = "closing";
        else if (status.includes("funded")) currentStep = "funded";
        else if (status.includes("submitted")) currentStep = "submitted";
      }
      
      setLoanApplication({
        id: lead.id,
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        propertyAddress: lead.propertyAddress || 'No address provided',
        loanAmount: loanAmount,
        loanStatus: lead.mortgageData?.loan?.status || "Processing",
        loanId: lead.mortgageData?.loan?.loanNumber || `ML-${lead.id}`,
        mortgageData: lead.mortgageData || {},
        currentStep: currentStep
      });
    } catch (error) {
      console.error("Error in fetchLoanApplicationData:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const saveFormData = async (sectionData: any) => {
    if (!id) return;

    setIsSaving(true);
    try {
      const { section, data } = sectionData;
      
      const { mortgageData = {} } = loanApplication || {};
      
      const updatedMortgageData = {
        ...mortgageData,
        [section]: {
          ...(mortgageData[section] || {}),
          ...data
        }
      };
      
      const { data: responseData, error } = await supabase.functions.invoke('update-lead', {
        body: { 
          leadId: id,
          leadData: { mortgageData: updatedMortgageData }
        }
      });
      
      if (error || !responseData.success) {
        throw new Error(error || responseData?.error || "Failed to update loan application");
      }
      
      setLoanApplication(prev => {
        if (!prev) return null;
        return {
          ...prev,
          mortgageData: updatedMortgageData
        };
      });
      
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} information saved successfully`);
      
      fetchLoanApplicationData(id);
      
    } catch (error) {
      console.error("Error saving form data:", error);
      toast.error("Failed to save information");
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  const handleFileAccepted = async (file: File) => {
    if (!id || !file) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uniqueFileName = `${Date.now()}_${file.name}`;
      const fileType = guessDocumentType(file.name);
      
      toast.info(`Analyzing ${fileType || 'document'}: ${file.name}...`);
      
      const { error: uploadError, data } = await supabase.storage
        .from('borrower-documents')
        .upload(`leads/${id}/${uniqueFileName}`, file);
        
      if (uploadError) {
        throw new Error(`Error uploading document: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('borrower-documents')
        .getPublicUrl(`leads/${id}/${uniqueFileName}`);
      
      const { data: analysisData, error } = await supabase.functions.invoke('analyze-pdf-document', {
        body: { 
          fileUrl: publicUrl, 
          fileType: fileType,
          leadId: id
        }
      });
      
      if (error) {
        throw new Error(`Error analyzing document: ${error.message}`);
      }
      
      await fetchLoanApplicationData(id);
      
      toast.success('Document successfully analyzed and data extracted!');
      
    } catch (error: any) {
      console.error('Error processing document:', error);
      toast.error(`Failed to process document: ${error.message || 'Unknown error'}`);
    }
  };

  const guessDocumentType = (filename: string): string | undefined => {
    const lowercaseFilename = filename.toLowerCase();
    
    if (lowercaseFilename.includes('1003') || lowercaseFilename.includes('application')) {
      return '1003';
    } else if (lowercaseFilename.includes('mortgage') || lowercaseFilename.includes('statement')) {
      return 'mortgage_statement';
    } else if (lowercaseFilename.includes('w2') || lowercaseFilename.includes('w-2')) {
      return 'w2';
    } else if (lowercaseFilename.includes('paystub') || lowercaseFilename.includes('pay stub') ||
               lowercaseFilename.includes('payslip') || lowercaseFilename.includes('pay slip')) {
      return 'paystub';
    }
    
    return undefined; // Unknown document type
  };

  const renderContent = () => {
    const mainTab = activeTab.includes("-") ? activeTab.split("-")[0] : activeTab;
    const subSection = activeTab.includes("-") ? activeTab.split("-")[1] : null;
    
    switch(mainTab) {
      case "1003":
        if (subSection) {
          return render1003Section(subSection);
        }
        return render1003Section("personal"); // Default to personal info
        
      case "products":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Products and Pricing</h2>
            <p className="text-gray-600">
              View available loan products and pricing options.
            </p>
          </div>
        );
      case "processor":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Processor Assist</h2>
            <p className="text-gray-600">
              Get assistance with loan processing tasks.
            </p>
          </div>
        );
      case "pitchDeck":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Pitch Deck Pro</h2>
            <p className="text-gray-600">
              Create and manage presentation materials for this loan.
            </p>
          </div>
        );
      case "aiLoanOfficer":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">AI Loan Officer</h2>
            <p className="text-gray-600">
              Get AI assistance with loan officer tasks.
            </p>
          </div>
        );
      case "fees":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Fees</h2>
            <p className="text-gray-600">
              View and manage loan fees.
            </p>
          </div>
        );
      case "documents":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Document Manager</h2>
            <p className="text-gray-600">
              Manage loan documents and paperwork.
            </p>
          </div>
        );
      case "conditions":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Conditions</h2>
            <p className="text-gray-600">
              View and manage loan conditions.
            </p>
          </div>
        );
      case "withdraw":
        return (
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Withdraw / Cancel Loan</h2>
            <p className="text-gray-600">
              Options to withdraw or cancel this loan application.
            </p>
          </div>
        );
      default:
        return <div className="p-6">Select an option from the sidebar</div>;
    }
  };

  const render1003Section = (section: string) => {
    const sectionTitles = {
      personal: "Personal Information",
      employment: "Employment & Income",
      assets: "Assets",
      liabilities: "Liabilities",
      realEstate: "Real Estate Owned",
      loanInfo: "Loan Information",
      housing: "Housing Expenses",
      transaction: "Details of Transaction",
      declarations: "Declarations",
      government: "Government Monitoring"
    };
    
    const title = sectionTitles[section as keyof typeof sectionTitles] || "Loan Application";
    
    console.log(`Rendering 1003 section: ${section} with data:`, loanApplication?.mortgageData);
    
    return (
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4">1003: {title}</h2>
        
        {section === "personal" && loanApplication && (
          <PersonalInfoForm 
            leadId={loanApplication.id} 
            mortgageData={loanApplication.mortgageData} 
            onSave={saveFormData}
            isEditable={true}
          />
        )}
        
        {section === "employment" && loanApplication && (
          <EmploymentIncomeForm 
            leadId={loanApplication.id} 
            mortgageData={loanApplication.mortgageData} 
            onSave={saveFormData}
            isEditable={true}
          />
        )}
        
        {section === "assets" && loanApplication && (
          <AssetInformationForm 
            leadId={loanApplication.id} 
            mortgageData={loanApplication.mortgageData} 
            onSave={saveFormData}
            isEditable={true}
          />
        )}
        
        {section === "liabilities" && loanApplication && (
          <LiabilityInformationForm 
            leadId={loanApplication.id} 
            mortgageData={loanApplication.mortgageData} 
            onSave={saveFormData}
            isEditable={true}
          />
        )}
        
        {section === "realEstate" && loanApplication && (
          <RealEstateOwnedForm
            leadId={loanApplication.id} 
            mortgageData={loanApplication.mortgageData} 
            onSave={saveFormData}
            isEditable={true}
          />
        )}
        
        {section === "loanInfo" && loanApplication && (
          <LoanInformationForm
            leadId={loanApplication.id} 
            mortgageData={loanApplication.mortgageData} 
            onSave={saveFormData}
            isEditable={true}
          />
        )}
        
        {section === "housing" && loanApplication && (
          <HousingExpensesForm
            leadId={loanApplication.id} 
            mortgageData={loanApplication.mortgageData} 
            onSave={saveFormData}
            isEditable={true}
          />
        )}
        
        {section !== "personal" && 
         section !== "employment" && 
         section !== "assets" && 
         section !== "liabilities" && 
         section !== "realEstate" &&
         section !== "loanInfo" &&
         section !== "housing" && (
          <div className="mt-4 p-4 border rounded-md bg-gray-50">
            <p className="text-gray-500 italic">
              This section has not been implemented yet. It will contain fields for {title.toLowerCase()}.
            </p>
          </div>
        )}
      </div>
    );
  };

  const getDescription = (section: string): string => {
    switch(section) {
      case "personal":
        return "Basic information about the borrower including name, address, and contact details.";
      case "employment":
        return "Information about current and previous employment, income sources, and verification.";
      case "assets":
        return "Details about financial assets including bank accounts, investments, and other holdings.";
      case "liabilities":
        return "Information about existing debts and financial obligations.";
      case "realEstate":
        return "Details about properties currently owned by the borrower.";
      case "loanInfo":
        return "Specific information about the loan being requested and property details.";
      case "housing":
        return "Current housing expenses and projected expenses after the loan.";
      case "transaction":
        return "Breakdown of the purchase transaction including costs and sources of funds.";
      case "declarations":
        return "Legal declarations required for mortgage applications.";
      case "government":
        return "Government-required monitoring information for fair lending purposes.";
      default:
        return "Complete the form to continue with your loan application.";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
      </div>
    );
  }

  if (!loanApplication) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold text-gray-700">Loan application not found</h2>
        <p className="mt-2 text-gray-500">The requested loan application could not be found.</p>
        <Button onClick={goBack} className="mt-4" variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm p-4">
        <Button 
          onClick={goBack} 
          variant="outline" 
          size="sm" 
          className="rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <LoanProgressTracker leadId={id || ''} showLoader={true} />
      
      <div className="bg-white px-8 py-4 border-b">
        <PDFDropZone 
          onFileAccepted={handleFileAccepted} 
          className="max-w-3xl mx-auto"
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <LoanApplicationSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          leadId={id}
        />
        <div className="flex-1 overflow-auto bg-white border-l">
          <div className="p-6 border-b bg-gray-50">
            <h1 className="text-2xl font-bold text-mortgage-darkPurple">
              Loan Application: {loanApplication.loanId}
            </h1>
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <span className="px-2 py-1 rounded-full bg-mortgage-lightPurple text-mortgage-darkPurple text-xs font-medium mr-2">
                {loanApplication.loanStatus}
              </span>
              <span>{loanApplication.firstName} {loanApplication.lastName} • {loanApplication.propertyAddress}</span>
            </div>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default LoanApplicationViewer;
