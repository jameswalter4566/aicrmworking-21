import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { leadProfileService } from "@/services/leadProfile";

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
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('processing');
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingStep, setProcessingStep] = useState(1);
  const [missingFields, setMissingFields] = useState<{section: string, field: string, label: string}[]>([]);
  const [processedFields, setProcessedFields] = useState<Record<string, any>>({});
  const [editedMissingFields, setEditedMissingFields] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [isClientPortal, setIsClientPortal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const isInClientPortal = window.location.pathname.includes('client-portal');
    setIsClientPortal(isInClientPortal);
    
    const params = new URLSearchParams(location.search);
    const o = params.get("origin");
    setOrigin(o);

    const fetchData = async () => {
      try {
        const leadData = await leadProfileService.getLeadById(leadId || '');
        
        if (leadData.mortgageData?.autoFilledAt && leadData.mortgageData?.documentProcessing?.status === 'completed') {
          setProcessingStep(5);
          setIsProcessing(false);
          setActiveTab('results');
          
          setProcessedFields(leadData.mortgageData);
          
          if (leadData.mortgageData.documentProcessing?.missingFields) {
            setMissingFields(leadData.mortgageData.documentProcessing.missingFields);
          }
          
          return;
        }
        
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
            
            leadProfileService.getLeadById(leadId || '').then(updatedData => {
              if (updatedData.mortgageData?.autoFilledAt) {
                setProcessedFields(updatedData.mortgageData);
                
                if (updatedData.mortgageData.documentProcessing?.missingFields) {
                  setMissingFields(updatedData.mortgageData.documentProcessing.missingFields);
                }
              } else {
                setMissingFields([
                  { section: "borrower", field: "citizenship", label: "Citizenship Status" },
                  { section: "borrower", field: "mailingAddress", label: "Current Mailing Address" },
                  { section: "employment", field: "previousEmployment", label: "Previous Employment History" },
                  { section: "assets", field: "investments", label: "Investment Accounts" },
                  { section: "liabilities", field: "creditCards", label: "Credit Card Accounts" },
                  { section: "liabilities", field: "loans", label: "Outstanding Loans" }
                ]);
                
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
              }
              
              toast({
                title: "Processing complete!",
                description: "Your documents have been analyzed and your 1003 form has been filled out.",
              });
            });
          }
        }, 2000);
        
        return () => clearInterval(intervalId);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsProcessing(false);
        setActiveTab('results');
        
        toast({
          title: "Error processing documents",
          description: "There was an error processing your documents. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    fetchData();
  }, [leadId, toast, location.search]);

  const fieldKey = (section: string, field: string) => `${section}__${field}`;

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updates: Record<string, any> = {};
      
      for (const f of missingFields) {
        const key = fieldKey(f.section, f.field);
        if (editedMissingFields[key]) {
          if (!updates[f.section]) updates[f.section] = {};
          updates[f.section][f.field] = editedMissingFields[key];
        }
      }
      
      if (Object.keys(updates).length === 0) {
        setIsSaving(false);
        return;
      }

      const structuredUpdates: Record<string, any> = {};
      
      Object.keys(updates).forEach(section => {
        if (section === 'borrower') {
          if (!structuredUpdates.personalInfo) {
            structuredUpdates.personalInfo = {
              personalInfo: {},
              contactDetails: {},
              addressHistory: {}
            };
          }
          
          if (updates.borrower.firstName) 
            structuredUpdates.personalInfo.personalInfo.firstName = updates.borrower.firstName;
          if (updates.borrower.lastName) 
            structuredUpdates.personalInfo.personalInfo.lastName = updates.borrower.lastName;
          if (updates.borrower.ssn) 
            structuredUpdates.personalInfo.personalInfo.socialSecurityNumber = updates.borrower.ssn;
          if (updates.borrower.dob) 
            structuredUpdates.personalInfo.personalInfo.dateOfBirth = updates.borrower.dob;
          if (updates.borrower.maritalStatus) 
            structuredUpdates.personalInfo.personalInfo.maritalStatus = updates.borrower.maritalStatus;
          if (updates.borrower.citizenship) 
            structuredUpdates.personalInfo.personalInfo.citizenship = updates.borrower.citizenship;
          if (updates.borrower.dependents) 
            structuredUpdates.personalInfo.personalInfo.numberOfDependents = updates.borrower.dependents;
          
          if (updates.borrower.phoneNumber) 
            structuredUpdates.personalInfo.contactDetails.cellPhoneNumber = updates.borrower.phoneNumber;
          if (updates.borrower.email) 
            structuredUpdates.personalInfo.contactDetails.emailAddress = updates.borrower.email;
          
          if (updates.borrower.mailingAddress) 
            structuredUpdates.personalInfo.addressHistory.presentAddressLine1 = updates.borrower.mailingAddress;
          
          structuredUpdates.borrower = updates.borrower;
        } 
        else if (section === 'employment') {
          if (!structuredUpdates.employment) {
            structuredUpdates.employment = {
              data: {
                borrower: {
                  incomeEntries: []
                }
              },
              section: "employment"
            };
          }
          
          const incomeEntry = {
            id: Date.now().toString(),
            employerName: updates.employment.employerName || "",
            position: updates.employment.position || "",
            startDate: "",
            monthlyIncome: {
              base: updates.employment.monthlyIncome ? parseFloat(updates.employment.monthlyIncome) || 0 : 0
            },
            type: "primaryCurrentEmployment"
          };
          
          structuredUpdates.employment.data.borrower.incomeEntries = [
            incomeEntry,
            ...(processedFields.employment?.data?.borrower?.incomeEntries || []).filter(
              (entry: any) => entry.type !== "primaryCurrentEmployment"
            )
          ];
        }
        else if (section === 'assets') {
          if (!structuredUpdates.assets) {
            structuredUpdates.assets = {
              accounts: []
            };
          }
          
          if (updates.assets.accountType || updates.assets.bankName || 
              updates.assets.accountNumber || updates.assets.balance) {
            structuredUpdates.assets.accounts = [
              ...(structuredUpdates.assets.accounts || []),
              {
                id: Date.now().toString(),
                accountType: updates.assets.accountType || "",
                financialInstitution: updates.assets.bankName || "",
                accountNumber: updates.assets.accountNumber || "",
                balance: updates.assets.balance ? parseFloat(updates.assets.balance) || 0 : 0,
              }
            ];
          }
        } 
        else if (section === 'property') {
          structuredUpdates.property = {
            ...(processedFields.property || {}),
            address: updates.property.address || "",
            city: updates.property.city || "",
            state: updates.property.state || "",
            zipCode: updates.property.zipCode || "",
            estimatedValue: updates.property.estimatedValue || "",
            propertyType: updates.property.propertyType || "",
            occupancy: updates.property.occupancy || ""
          };
        }
        else if (section === 'loan') {
          structuredUpdates.loan = {
            ...(processedFields.loan || {}),
            purpose: updates.loan.purpose || "",
            loanAmount: updates.loan.loanAmount || "",
            loanType: updates.loan.loanType || "",
            mortgageTerm: updates.loan.mortgageTerm || "",
            amortizationType: updates.loan.amortizationType || "",
            interestRate: updates.loan.interestRate || ""
          };
        }
        else if (section === 'liabilities') {
          if (!structuredUpdates.liabilities) {
            structuredUpdates.liabilities = {
              accounts: []
            };
          }
          
          if (updates.liabilities.creditCards) {
            structuredUpdates.liabilities.creditCards = updates.liabilities.creditCards;
          }
          if (updates.liabilities.loans) {
            structuredUpdates.liabilities.loans = updates.liabilities.loans;
          }
          if (updates.liabilities.carLoans) {
            structuredUpdates.liabilities.carLoans = updates.liabilities.carLoans;
          }
          if (updates.liabilities.studentLoans) {
            structuredUpdates.liabilities.studentLoans = updates.liabilities.studentLoans;
          }
          if (updates.liabilities.otherDebts) {
            structuredUpdates.liabilities.otherDebts = updates.liabilities.otherDebts;
          }
        }
        else {
          structuredUpdates[section] = updates[section];
        }
      });

      let currentMortgage = { ...processedFields, ...structuredUpdates };
      
      console.log("Saving structured updates:", structuredUpdates);

      await leadProfileService.updateMortgageData(
        leadId as string,
        "",
        currentMortgage
      );

      setIsSaving(false);
      setEditedMissingFields({});
      toast({
        title: "Saved!",
        description: "Your updates have been saved.",
      });
      
      const leadData = await leadProfileService.getLeadById(leadId || '');
      if (leadData.mortgageData) {
        setProcessedFields(leadData.mortgageData);
      }
      
    } catch (err: any) {
      setIsSaving(false);
      setSaveError(err?.message || "Error saving fields");
      toast({
        title: "Save Failed",
        description: err?.message || "Failed to update fields. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGoToForm = () => {
    if (isClientPortal) {
      navigate('/client-portal');
      toast({
        title: "1003 Form Updated",
        description: "Your information has been saved to your loan application."
      });
    } else if (origin) {
      navigate(origin.startsWith("/") ? origin : `/${origin}`);
      toast({
        title: "1003 Form Updated",
        description: "Your information has been saved to the 1003 form."
      });
    } else {
      navigate(`/loan-application/${leadId}`);
      toast({
        title: "1003 Form Updated",
        description: "Your information has been saved to the 1003 form."
      });
    }
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-green-800">Form Auto-Fill Complete</h3>
                      <p className="text-sm text-green-700">
                        We've successfully extracted information from your documents and filled out your 1003 form.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-lg mb-3">Successfully Extracted Fields</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formSections.map(section => (
                        <Card key={section.id} className="bg-green-50">
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm">{section.label}</CardTitle>
                          </CardHeader>
                          <CardContent className="py-2 px-4">
                            <div className="space-y-2">
                              {processedFields[section.id] ? (
                                Object.entries(processedFields[section.id]).map(([key, value]) => (
                                  <div key={key} className="flex items-center">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mr-2" />
                                    <p className="text-sm">
                                      <span className="font-medium">{key}: </span>
                                      <span className="text-gray-700">
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
                  
                  <div>
                    <h3 className="font-medium text-lg mb-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                      Missing Fields
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      The following fields could not be extracted from your documents and need to be filled out manually.
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <Accordion type="multiple" className="">
                        {missingFields.map((field) => {
                          const key = fieldKey(field.section, field.field);
                          const inputType = field.label.length > 24 ? "textarea" : "input";
                          return (
                            <AccordionItem value={key} key={key} className="mb-2 border-b border-red-200">
                              <AccordionTrigger className="pr-3">
                                <span className="flex items-center text-red-800">
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 mr-2" />
                                  <span className="text-sm font-medium">{field.label}</span>
                                  <span className="text-xs text-red-600 ml-2">
                                    ({formSections.find(s => s.id === field.section)?.label || field.section})
                                  </span>
                                </span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pl-6 py-3">
                                  {inputType === "textarea" ? (
                                    <Textarea
                                      className="mb-2"
                                      placeholder={`Enter value for ${field.label}`}
                                      value={editedMissingFields[key] ?? ""}
                                      onChange={e =>
                                        setEditedMissingFields(v => ({ ...v, [key]: e.target.value }))
                                      }
                                      rows={2}
                                    />
                                  ) : (
                                    <Input
                                      className="mb-2"
                                      placeholder={`Enter value for ${field.label}`}
                                      value={editedMissingFields[key] ?? ""}
                                      onChange={e =>
                                        setEditedMissingFields(v => ({ ...v, [key]: e.target.value }))
                                      }
                                    />
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                      <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
                        <Button
                          className="w-full sm:w-auto"
                          disabled={
                            isSaving ||
                            Object.keys(editedMissingFields).length === 0 ||
                            !Object.values(editedMissingFields).some(val => val && val.length > 0)
                          }
                          onClick={handleSaveAll}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Save All Changes
                            </>
                          )}
                        </Button>
                        {saveError && (
                          <span className="text-destructive text-xs">{saveError}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
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
