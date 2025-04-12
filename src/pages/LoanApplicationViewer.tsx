
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Upload, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoanProgressTracker from "@/components/mortgage/LoanProgressTracker";
import LoanApplicationSidebar from "@/components/mortgage/LoanApplicationSidebar";
import PDFDropZone from "@/components/mortgage/PDFDropZone";

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

const LoanApplicationViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loanApplication, setLoanApplication] = useState<LoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [loadError, setLoadError] = useState<string | null>(null);
  
  useEffect(() => {
    if (id) {
      fetchLoanApplicationData(id);
    }
  }, [id]);
  
  const fetchLoanApplicationData = async (leadId: string) => {
    setLoading(true);
    setLoadError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('retrieve-leads', {
        body: { 
          leadId: leadId,
          industryFilter: 'mortgage',
          exactMatch: true
        }
      });

      if (error) {
        console.error("Error fetching loan application:", error);
        toast.error("Failed to load loan application details");
        setLoadError(`API Error: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data.success || !data.data || data.data.length === 0) {
        console.error("API returned error or no data:", data.error);
        toast.error(data.error || "Failed to load loan application details");
        setLoadError(`No data returned for lead ID: ${leadId}`);
        setLoading(false);
        return;
      }

      const lead = data.data[0];
      
      if (lead.id.toString() !== leadId.toString()) {
        console.error(`Lead ID mismatch! Requested ${leadId} but got ${lead.id}`);
        setLoadError(`Data error: Received incorrect lead (${lead.id}) instead of requested lead (${leadId})`);
        setLoading(false);
        return;
      }
      
      const loanAmountStr = lead.mortgageData?.property?.loanAmount || '0';
      const loanAmount = parseFloat(loanAmountStr.replace(/,/g, '')) || 0;
      
      let currentStep = "applicationCreated";
      
      if (lead.mortgageData?.loan?.status) {
        const status = lead.mortgageData.loan.status.toLowerCase();
        if (status.includes("processing")) currentStep = "processing";
        else if (status.includes("approved")) currentStep = "approved";
        else if (status.includes("closing")) currentStep = "closing";
        else if (status.includes("funded")) currentStep = "funded";
        else if (status.includes("submitted")) currentStep = "submitted";
      }
      
      const loanAppData = {
        id: lead.id,
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        propertyAddress: lead.propertyAddress || 'No address provided',
        loanAmount: loanAmount,
        loanStatus: lead.mortgageData?.loan?.status || "Processing",
        loanId: lead.mortgageData?.loan?.loanNumber || `ML-${lead.id}`,
        mortgageData: lead.mortgageData || {},
        currentStep: currentStep
      };
      
      setLoanApplication(loanAppData);
    } catch (error: any) {
      console.error("Error in fetchLoanApplicationData:", error);
      toast.error("An unexpected error occurred");
      setLoadError(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePdfDrop = async (file: File) => {
    if (!id || !file) return;
    
    try {
      const uniqueFileName = `${Date.now()}_${file.name}`;
      const fileType = guessDocumentType(file.name);
      
      toast.info(`Analyzing ${fileType || 'document'}: ${file.name}...`);
      
      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('borrower-documents')
        .upload(`leads/${id}/${uniqueFileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Error uploading document: ${uploadError.message}`);
      }
      
      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('borrower-documents')
        .getPublicUrl(`leads/${id}/${uniqueFileName}`);
      
      // Analyze PDF using edge function
      const { data, error } = await supabase.functions.invoke('analyze-pdf-document', {
        body: { 
          fileUrl: publicUrl, 
          fileType: fileType,
          leadId: id
        }
      });
      
      if (error) {
        console.error('Analysis error:', error);
        throw new Error(`Error analyzing document: ${error.message}`);
      }
      
      // Refresh loan application data after successful analysis
      await fetchLoanApplicationData(id);
      
      // Display success toast with document type and details
      toast.success(`Successfully analyzed ${fileType || 'document'}!`, {
        description: `Extracted data from ${file.name}`
      });
      
    } catch (error) {
      console.error('Document processing error:', error);
      toast.error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        description: 'Please try uploading the document again'
      });
    }
  };

  // Helper function to guess document type from filename
  const guessDocumentType = (filename: string): string => {
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('payslip') || lowerFilename.includes('pay')) return 'Pay Slip';
    if (lowerFilename.includes('bank') || lowerFilename.includes('statement')) return 'Bank Statement';
    if (lowerFilename.includes('tax') || lowerFilename.includes('return')) return 'Tax Return';
    if (lowerFilename.includes('id') || lowerFilename.includes('license')) return 'ID Document';
    if (lowerFilename.includes('w2') || lowerFilename.includes('w-2')) return 'W-2';
    if (lowerFilename.includes('1099')) return '1099';
    if (lowerFilename.includes('approval')) return 'Approval Letter';
    return 'Document';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const goBack = () => {
    navigate('/pipeline');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple mx-auto mb-4" />
          <p className="text-gray-600">Loading loan application for ID: {id}...</p>
        </div>
      </div>
    );
  }

  if (loadError || !loanApplication) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold text-gray-700">
          {loadError ? "Error loading loan application" : "Loan application not found"}
        </h2>
        <p className="mt-2 text-gray-500">
          {loadError || `The requested loan application (ID: ${id}) could not be found.`}
        </p>
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
          Back to Pipeline
        </Button>
      </div>

      <LoanProgressTracker currentStep={loanApplication.currentStep || "applicationCreated"} />

      <div className="flex flex-1">
        {/* Main content */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 className="text-2xl font-bold text-mortgage-purple mb-2">
              {loanApplication.loanId}: {loanApplication.firstName} {loanApplication.lastName}
            </h1>
            <div className="flex flex-wrap items-center mt-2 text-sm text-gray-600">
              <span className="px-2 py-1 rounded-full bg-mortgage-lightPurple text-mortgage-purple text-xs font-medium mr-2 mb-1">
                {loanApplication.loanStatus}
              </span>
              <span className="mr-4 mb-1">{loanApplication.propertyAddress}</span>
              <span className="font-medium mb-1">{formatCurrency(loanApplication.loanAmount)}</span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
              <TabsTrigger value="notes">Notes & History</TabsTrigger>
              <TabsTrigger value="details">Loan Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-mortgage-darkPurple">Loan Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="bg-mortgage-lightPurple pb-2">
                    <CardTitle className="text-lg font-medium text-mortgage-darkPurple">Borrower Information</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p><strong>Name:</strong> {loanApplication.firstName} {loanApplication.lastName}</p>
                    <p><strong>Property:</strong> {loanApplication.propertyAddress}</p>
                    <p><strong>Loan Amount:</strong> {formatCurrency(loanApplication.loanAmount)}</p>
                    <p><strong>Loan ID:</strong> {loanApplication.loanId}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="bg-mortgage-lightPurple pb-2">
                    <CardTitle className="text-lg font-medium text-mortgage-darkPurple">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="text-mortgage-purple border-mortgage-purple hover:bg-mortgage-lightPurple">
                        <FileText className="h-4 w-4 mr-2" />
                        View 1003
                      </Button>
                      <Button variant="outline" className="text-mortgage-purple border-mortgage-purple hover:bg-mortgage-lightPurple">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="documents" className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-mortgage-darkPurple">Document Upload</h2>
              <PDFDropZone onFileAccepted={handlePdfDrop} />
            </TabsContent>
            
            <TabsContent value="conditions" className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-mortgage-darkPurple">Loan Conditions</h2>
              <p className="text-gray-500">No conditions found for this loan.</p>
            </TabsContent>
            
            <TabsContent value="notes" className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-mortgage-darkPurple">Notes & History</h2>
              <p className="text-gray-500">No notes found for this loan.</p>
            </TabsContent>
            
            <TabsContent value="details" className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 text-mortgage-darkPurple">Loan Details</h2>
              <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[600px]">
                {JSON.stringify(loanApplication.mortgageData, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Sidebar */}
        <LoanApplicationSidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  );
};

export default LoanApplicationViewer;
