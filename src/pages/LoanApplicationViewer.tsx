
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import MainLayout from '@/components/layouts/MainLayout';
import PDFDropZone from '@/components/mortgage/PDFDropZone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalInfoForm } from '@/components/mortgage/1003/PersonalInfoForm';
import { LoanInformationForm } from '@/components/mortgage/1003/LoanInformationForm';
import { EmploymentIncomeForm } from '@/components/mortgage/1003/EmploymentIncomeForm';
import { AssetInformationForm } from '@/components/mortgage/1003/AssetInformationForm';
import { LiabilityInformationForm } from '@/components/mortgage/1003/LiabilityInformationForm';
import { RealEstateOwnedForm } from '@/components/mortgage/1003/RealEstateOwnedForm';
import { HousingExpensesForm } from '@/components/mortgage/1003/HousingExpensesForm';
import LoanApplicationSidebar from '@/components/mortgage/LoanApplicationSidebar';
import LoanProgressTracker from '@/components/mortgage/LoanProgressTracker';

// Helper function to guess document type based on filename
const guessDocumentType = (filename: string): string | null => {
  filename = filename.toLowerCase();
  
  if (filename.includes('w2') || filename.includes('w-2')) return 'W-2';
  if (filename.includes('paystub') || filename.includes('pay stub')) return 'Paystub';
  if (filename.includes('mortgage') && filename.includes('statement')) return 'Mortgage Statement';
  if (filename.includes('bank') && filename.includes('statement')) return 'Bank Statement';
  if (filename.includes('1040') || filename.includes('tax')) return 'Tax Return';
  if (filename.includes('license') || filename.includes('passport') || filename.includes('id')) return 'Government ID';
  if (filename.includes('utility') || filename.includes('bill')) return 'Utility Bill';
  if (filename.includes('employment') || filename.includes('letter')) return 'Employment Letter';
  if (filename.includes('lease') || filename.includes('rental')) return 'Lease Agreement';
  if (filename.includes('social') && filename.includes('security')) return 'Social Security Letter';
  
  return null;
};

const LoanApplicationViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loanData, setLoanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (id) {
      fetchLoanApplicationData(id);
    }
  }, [id]);

  const fetchLoanApplicationData = async (leadId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loan_applications')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) {
        throw error;
      }

      setLoanData(data || {});
    } catch (error) {
      console.error('Error fetching loan application data:', error);
      toast.error('Failed to load loan application data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async (formData: any) => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('loan_applications')
        .update({
          ...formData.data
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast.success('Loan information updated successfully');
    } catch (error) {
      console.error('Error updating loan application:', error);
      toast.error('Failed to update loan information');
    }
  };
  
  // Update handlePdfDrop method
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mortgage-purple"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row gap-4 p-4">
        <div className="w-full md:w-3/4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-mortgage-darkPurple">
              {loanData?.borrower?.firstName || 'New'} {loanData?.borrower?.lastName || 'Application'}
            </h1>
            <div>
              <LoanProgressTracker progress={loanData?.completionPercentage || 0} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-lg">Loan Amount</h3>
                <p className="text-2xl font-bold">${loanData?.loanAmount?.toLocaleString() || '0'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-lg">Property Value</h3>
                <p className="text-2xl font-bold">${loanData?.propertyValue?.toLocaleString() || '0'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium text-lg">Loan Type</h3>
                <p className="text-2xl font-bold">{loanData?.loanType || 'Conventional'}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <PDFDropZone onFileAccepted={handlePdfDrop} className="h-full" />

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">Document Processing</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload borrower documents to our AI loan officer assistant.
                  It will automatically extract and populate data into the correct fields.
                </p>
                <ul className="text-sm space-y-2">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Paystubs & W-2s
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Bank Statements
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Tax Returns
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Government IDs
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 md:grid-cols-7 mb-6">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="loan">Loan</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
              <TabsTrigger value="realestate">Real Estate</TabsTrigger>
              <TabsTrigger value="housing">Housing</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardContent className="p-6">
                  <PersonalInfoForm
                    leadId={id || ''}
                    mortgageData={loanData}
                    onSave={handleSaveForm}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="loan">
              <Card>
                <CardContent className="p-6">
                  <LoanInformationForm
                    leadId={id || ''}
                    mortgageData={loanData}
                    onSave={handleSaveForm}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employment">
              <Card>
                <CardContent className="p-6">
                  <EmploymentIncomeForm
                    leadId={id || ''}
                    mortgageData={loanData}
                    onSave={handleSaveForm}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assets">
              <Card>
                <CardContent className="p-6">
                  <AssetInformationForm
                    leadId={id || ''}
                    mortgageData={loanData}
                    onSave={handleSaveForm}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="liabilities">
              <Card>
                <CardContent className="p-6">
                  <LiabilityInformationForm
                    leadId={id || ''}
                    mortgageData={loanData}
                    onSave={handleSaveForm}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="realestate">
              <Card>
                <CardContent className="p-6">
                  <RealEstateOwnedForm
                    leadId={id || ''}
                    mortgageData={loanData}
                    onSave={handleSaveForm}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="housing">
              <Card>
                <CardContent className="p-6">
                  <HousingExpensesForm
                    leadId={id || ''}
                    mortgageData={loanData}
                    onSave={handleSaveForm}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-full md:w-1/4 mt-4 md:mt-0">
          <LoanApplicationSidebar loanData={loanData} />
        </div>
      </div>
    </MainLayout>
  );
};

export default LoanApplicationViewer;
