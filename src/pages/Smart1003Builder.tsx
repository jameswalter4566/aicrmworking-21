
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileUp, FileText, CheckCircle2, AlertTriangle, 
  Loader2, RefreshCw, ArrowRight, FileCheck
} from "lucide-react";

// Mock form sections and fields
const formSections = [
  {
    id: 'borrower',
    label: 'Borrower Information',
    fields: ['First Name', 'Last Name', 'Social Security Number', 'Date of Birth', 'Phone Number', 'Email', 'Marital Status']
  },
  {
    id: 'employment',
    label: 'Employment & Income',
    fields: ['Employer Name', 'Position', 'Years at Job', 'Monthly Income']
  },
  {
    id: 'assets',
    label: 'Assets & Accounts',
    fields: ['Bank Name', 'Account Type', 'Account Number', 'Balance']
  },
  {
    id: 'liabilities',
    label: 'Liabilities & Debts',
    fields: ['Credit Cards', 'Car Loans', 'Student Loans', 'Other Debts']
  },
  {
    id: 'property',
    label: 'Property Information',
    fields: ['Property Address', 'City', 'State', 'ZIP Code', 'Estimated Value']
  }
];

const Smart1003Builder = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const [activeTab, setActiveTab] = useState<string>('processing');
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingStep, setProcessingStep] = useState(1);
  const [missingFields, setMissingFields] = useState<{section: string, field: string, label: string}[]>([]);
  const [processedFields, setProcessedFields] = useState<Record<string, any>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  // Simulate processing steps
  useEffect(() => {
    const steps = [
      { step: 1, message: "Extracting data from documents..." },
      { step: 2, message: "Analyzing document content..." },
      { step: 3, message: "Identifying form fields..." },
      { step: 4, message: "Filling out 1003 form..." },
      { step: 5, message: "Validating information..." },
    ];

    let currentStep = 0;
    
    const intervalId = setInterval(() => {
      if (currentStep < steps.length) {
        setProcessingStep(steps[currentStep].step);
        
        toast({
          title: `Step ${steps[currentStep].step} of ${steps.length}`,
          description: steps[currentStep].message,
        });
        
        currentStep++;
      } else {
        clearInterval(intervalId);
        setIsProcessing(false);
        setActiveTab('results');
        
        // Set mock missing fields
        setMissingFields([
          { section: "borrower", field: "citizenship", label: "Citizenship Status" },
          { section: "borrower", field: "mailingAddress", label: "Current Mailing Address" },
          { section: "employment", field: "previousEmployment", label: "Previous Employment History" },
          { section: "assets", field: "investments", label: "Investment Accounts" },
          { section: "liabilities", field: "creditCards", label: "Credit Card Accounts" },
          { section: "liabilities", field: "loans", label: "Outstanding Loans" }
        ]);
        
        // Set mock processed fields
        setProcessedFields({
          borrower: {
            firstName: "John",
            lastName: "Doe",
            ssn: "XXX-XX-1234",
            dob: "1980-01-15",
            phoneNumber: "(555) 123-4567",
            email: "john.doe@example.com",
            maritalStatus: "Married"
          },
          employment: {
            employerName: "ACME Corporation",
            position: "Software Engineer",
            yearsAtJob: 5,
            monthlyIncome: 8500
          },
          assets: [
            {
              accountType: "Checking",
              bankName: "First National Bank",
              accountNumber: "XXXX1234",
              balance: 12500.75
            },
            {
              accountType: "Savings", 
              bankName: "First National Bank",
              accountNumber: "XXXX5678",
              balance: 45000.50
            }
          ],
          property: {
            address: "123 Main St",
            city: "Anytown",
            state: "CA",
            zipCode: "12345",
            estimatedValue: 750000
          }
        });
        
        toast({
          title: "Processing complete!",
          description: "Your documents have been analyzed and your 1003 form has been filled out.",
        });
      }
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [toast]);

  const handleGoToForm = () => {
    // In a real implementation, this would navigate to the specific 1003 form section
    navigate(`/people/${leadId}`);
    
    toast({
      title: "1003 Form Updated",
      description: "Your information has been saved to the 1003 form."
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Smart 1003 Builder</h1>
          <Button variant="outline" onClick={() => navigate(`/people/${leadId}`)}>
            Back to Lead
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="processing" disabled={!isProcessing}>
              Document Processing
            </TabsTrigger>
            <TabsTrigger value="results" disabled={isProcessing}>
              Results & Next Steps
            </TabsTrigger>
          </TabsList>
          
          {/* Processing Tab */}
          <TabsContent value="processing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className={`h-5 w-5 ${isProcessing ? 'animate-spin' : ''}`} />
                  Processing Documents
                </CardTitle>
                <CardDescription>
                  We're analyzing your documents to auto-fill your 1003 form
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Progress bar */}
                  <div className="relative">
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-500 ease-out" 
                        style={{ width: `${(processingStep / 5) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500">Step {processingStep} of 5</span>
                      <span className="text-xs text-gray-500">{Math.round((processingStep / 5) * 100)}%</span>
                    </div>
                  </div>
                  
                  {/* Processing steps */}
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${processingStep >= 1 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {processingStep > 1 ? <CheckCircle2 className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-medium">Document Extraction</h3>
                        <p className="text-sm text-gray-500">Extracting text and data from your documents</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${processingStep >= 2 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {processingStep > 2 ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-medium">Content Analysis</h3>
                        <p className="text-sm text-gray-500">Analyzing the content of your documents</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${processingStep >= 3 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {processingStep > 3 ? <CheckCircle2 className="h-5 w-5" /> : processingStep === 3 ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileCheck className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-medium">Field Identification</h3>
                        <p className="text-sm text-gray-500">Identifying form fields from your documents</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${processingStep >= 4 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {processingStep > 4 ? <CheckCircle2 className="h-5 w-5" /> : processingStep === 4 ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-medium">Form Auto-Fill</h3>
                        <p className="text-sm text-gray-500">Auto-filling your 1003 form with the extracted data</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${processingStep >= 5 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {processingStep === 5 ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-medium">Validation</h3>
                        <p className="text-sm text-gray-500">Validating the extracted information</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Loading animation */}
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-blue-500" />
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-gray-500">Please wait while we process your documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Results Tab */}
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Processing Complete
                </CardTitle>
                <CardDescription>
                  We've analyzed your documents and filled out your 1003 form
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Success message */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-green-800">Form Auto-Fill Complete</h3>
                      <p className="text-sm text-green-700">
                        We've successfully extracted information from your documents and filled out your 1003 form.
                      </p>
                    </div>
                  </div>
                  
                  {/* Extracted Fields Summary */}
                  <div>
                    <h3 className="font-medium text-lg mb-3">Successfully Extracted Fields</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formSections.map(section => (
                        <Card key={section.id} className="bg-gray-50">
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm">{section.label}</CardTitle>
                          </CardHeader>
                          <CardContent className="py-2 px-4">
                            <div className="space-y-2">
                              {processedFields[section.id] ? (
                                Object.entries(processedFields[section.id]).map(([key, value]) => (
                                  <div key={key} className="flex items-center">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-2" />
                                    <p className="text-sm">
                                      <span className="font-medium">{key}: </span>
                                      <span className="text-gray-600">
                                        {typeof value === 'object' ? JSON.stringify(value) : value?.toString()}
                                      </span>
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500">No fields extracted for this section</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {/* Missing Fields */}
                  <div>
                    <h3 className="font-medium text-lg mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                      Missing Fields
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      The following fields could not be extracted from your documents and need to be filled out manually.
                    </p>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {missingFields.map((field, index) => (
                          <li key={index} className="flex items-center text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mr-2" />
                            <span className="text-sm">
                              {field.label} <span className="text-amber-600">({formSections.find(s => s.id === field.section)?.label})</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* Next Steps */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="font-medium text-lg mb-3">Next Steps</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Your 1003 form has been auto-filled with the extracted information. 
                      Please review and complete any missing fields.
                    </p>
                    
                    <Button onClick={handleGoToForm} className="w-full sm:w-auto">
                      Go to 1003 Form
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Smart1003Builder;
