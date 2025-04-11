
import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calculator, Save, Download, ArrowLeft, Send } from "lucide-react";
import SendPitchDeckModal from "@/components/pitch-deck/SendPitchDeckModal";
import LoanInfoForm, { MortgageDetailedData } from "@/components/pitch-deck/LoanInfoForm";

// Default empty pitch deck structure
const defaultPitchDeck = {
  title: "New Mortgage Proposal",
  description: "",
  template_type: "purchase",
  mortgage_data: {
    basicInfo: {
      propertyValue: 500000,
      currentLoan: {
        balance: 400000,
        rate: 4.5,
        payment: 2027,
        term: 30,
        type: "Conventional",
        paymentBreakdown: {
          principal: 600,
          interest: 1000,
          taxes: 300,
          insurance: 127
        }
      },
      proposedLoan: {
        amount: 400000,
        rate: 3.5,
        payment: 1796,
        term: 30,
        type: "Conventional",
        paymentBreakdown: {
          principal: 700,
          interest: 600,
          taxes: 300,
          insurance: 196
        }
      },
      savings: {
        monthly: 231,
        lifetime: 83160
      }
    }
  }
};

const PitchDeckBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pitchDeck, setPitchDeck] = useState(defaultPitchDeck);
  const [activeTab, setActiveTab] = useState("info");
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  
  // Fetch pitch deck data if editing an existing one
  useEffect(() => {
    const fetchPitchDeck = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.functions.invoke("retrieve-pitch-deck", {
          body: { pitchDeckId: id }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (data && data.success && data.data) {
          // Ensure mortgage_data structure is complete
          const fetchedDeck = data.data;
          if (!fetchedDeck.mortgage_data) {
            fetchedDeck.mortgage_data = defaultPitchDeck.mortgage_data;
          } else if (!fetchedDeck.mortgage_data.basicInfo) {
            // Convert old format to new format if needed
            fetchedDeck.mortgage_data = {
              basicInfo: {
                propertyValue: fetchedDeck.mortgage_data.propertyValue || 500000,
                currentLoan: fetchedDeck.mortgage_data.currentLoan || defaultPitchDeck.mortgage_data.basicInfo.currentLoan,
                proposedLoan: fetchedDeck.mortgage_data.proposedLoan || defaultPitchDeck.mortgage_data.basicInfo.proposedLoan,
                savings: fetchedDeck.mortgage_data.savings || defaultPitchDeck.mortgage_data.basicInfo.savings
              }
            };
          }
          
          setPitchDeck(fetchedDeck);
        }
      } catch (error: any) {
        console.error("Error fetching pitch deck:", error);
        toast.error(`Failed to load pitch deck: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPitchDeck();
  }, [id]);
  
  // Calculate mortgage payments whenever loan values change
  useEffect(() => {
    if (!pitchDeck?.mortgage_data?.basicInfo) return;
    
    // Calculate current loan payment if not already set
    const currentLoan = pitchDeck.mortgage_data.basicInfo.currentLoan;
    if (currentLoan && currentLoan.balance && currentLoan.rate && currentLoan.term) {
      const monthlyRate = currentLoan.rate / 100 / 12;
      const numPayments = currentLoan.term * 12;
      const payment = (currentLoan.balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments));
      
      if (Math.abs(payment - currentLoan.payment) > 1) {
        setPitchDeck(prev => ({
          ...prev,
          mortgage_data: {
            ...prev.mortgage_data,
            basicInfo: {
              ...prev.mortgage_data.basicInfo,
              currentLoan: {
                ...prev.mortgage_data.basicInfo.currentLoan,
                payment: Math.round(payment)
              }
            }
          }
        }));
      }
    }
    
    // Calculate proposed loan payment if not already set
    const proposedLoan = pitchDeck.mortgage_data.basicInfo.proposedLoan;
    if (proposedLoan && proposedLoan.amount && proposedLoan.rate && proposedLoan.term) {
      const monthlyRate = proposedLoan.rate / 100 / 12;
      const numPayments = proposedLoan.term * 12;
      const payment = (proposedLoan.amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments));
      
      if (Math.abs(payment - proposedLoan.payment) > 1) {
        setPitchDeck(prev => ({
          ...prev,
          mortgage_data: {
            ...prev.mortgage_data,
            basicInfo: {
              ...prev.mortgage_data.basicInfo,
              proposedLoan: {
                ...prev.mortgage_data.basicInfo.proposedLoan,
                payment: Math.round(payment)
              }
            }
          }
        }));
      }
    }
    
    // Calculate savings
    if (currentLoan && proposedLoan) {
      const monthlySavings = Math.round(currentLoan.payment - proposedLoan.payment);
      const lifetimeSavings = Math.round(monthlySavings * proposedLoan.term * 12);
      
      setPitchDeck(prev => ({
        ...prev,
        mortgage_data: {
          ...prev.mortgage_data,
          basicInfo: {
            ...prev.mortgage_data.basicInfo,
            savings: {
              monthly: monthlySavings,
              lifetime: lifetimeSavings
            }
          }
        }
      }));
    }
  }, [
    pitchDeck?.mortgage_data?.basicInfo?.currentLoan?.balance,
    pitchDeck?.mortgage_data?.basicInfo?.currentLoan?.rate,
    pitchDeck?.mortgage_data?.basicInfo?.currentLoan?.term,
    pitchDeck?.mortgage_data?.basicInfo?.proposedLoan?.amount,
    pitchDeck?.mortgage_data?.basicInfo?.proposedLoan?.rate,
    pitchDeck?.mortgage_data?.basicInfo?.proposedLoan?.term
  ]);
  
  // Handle saving the pitch deck
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-pitch-deck", {
        body: {
          action: "save",
          pitchDeckData: pitchDeck,
          pitchDeckId: id,
          generatePdf: false
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.success) {
        toast.success("Pitch deck saved successfully");
        // If this is a new pitch deck, redirect to the edit page with the new ID
        if (!id && data.data?.id) {
          navigate(`/pitch-deck/builder/${data.data.id}`, { replace: true });
        }
      }
    } catch (error: any) {
      console.error("Error saving pitch deck:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Handle downloading the PDF
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      // Save first to ensure all data is up to date
      const saveResponse = await supabase.functions.invoke("save-pitch-deck", {
        body: {
          action: "save",
          pitchDeckData: pitchDeck,
          pitchDeckId: id
        }
      });
      
      if (saveResponse.error) {
        throw new Error(saveResponse.error.message);
      }
      
      // Generate PDF
      const { data, error } = await supabase.functions.invoke("save-pitch-deck", {
        body: {
          action: "get-pdf",
          pitchDeckId: id || saveResponse.data?.data?.id,
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.pdfData) {
        // Create a download link for the PDF
        const link = document.createElement("a");
        link.href = data.pdfData;
        link.download = `${pitchDeck.title.replace(/\s+/g, "_")}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("PDF downloaded successfully");
      }
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      toast.error(`Failed to download PDF: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };
  
  // Open send email modal
  const handleOpenSendModal = () => {
    // First save the pitch deck to ensure all changes are saved
    handleSave().then(() => {
      setIsSendModalOpen(true);
    });
  };

  // Handle field changes
  const handleChange = (field: string, value: any) => {
    if (field.includes(".")) {
      const [section, subField] = field.split(".");
      setPitchDeck(prev => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof typeof prev] as object || {}),
          [subField]: value
        }
      }));
    } else {
      setPitchDeck(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  
  // Handle nested field changes for mortgage data
  const handleMortgageDataChange = (section: string, field: string, value: any) => {
    // Handle sections that have dots in them for deeper nesting
    if (section.includes(".")) {
      const parts = section.split(".");
      
      setPitchDeck(prev => {
        // Create a deep copy of the mortgage data
        const updatedMortgageData = JSON.parse(JSON.stringify(prev.mortgage_data || {}));
        
        // Navigate to the correct nested object
        let target = updatedMortgageData;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!target[parts[i]]) {
            target[parts[i]] = {};
          }
          target = target[parts[i]];
        }
        
        // Set the value on the last level
        const lastKey = parts[parts.length - 1];
        if (!target[lastKey]) {
          target[lastKey] = {};
        }
        
        // If the value is a number string, convert it to number
        const parsedValue = !isNaN(parseFloat(value)) ? parseFloat(value) : value;
        target[lastKey][field] = parsedValue;
        
        return {
          ...prev,
          mortgage_data: updatedMortgageData
        };
      });
    } else {
      setPitchDeck(prev => ({
        ...prev,
        mortgage_data: {
          ...prev.mortgage_data,
          [section]: {
            ...(prev.mortgage_data?.[section as keyof typeof prev.mortgage_data] || {}),
            [field]: !isNaN(parseFloat(value)) ? parseFloat(value) : value
          }
        }
      }));
    }
  };

  // Go back to pitch deck listing
  const handleBack = () => {
    navigate("/pitch-deck");
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading pitch deck...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack} title="Back to Pitch Decks">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Pitch Deck Builder</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={downloading || !id}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Downloading..." : "Download PDF"}
            </Button>

            <Button 
              variant="default"
              onClick={handleOpenSendModal}
              disabled={!id}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send to Client
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>
              <Input 
                value={pitchDeck.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="text-xl font-bold border-none p-0 h-auto text-black focus-visible:ring-0"
                placeholder="Enter Pitch Deck Title"
              />
            </CardTitle>
            <CardDescription>
              <Input 
                value={pitchDeck.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="border-none p-0 h-auto text-gray-600 focus-visible:ring-0"
                placeholder="Enter description (optional)"
              />
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="info">Loan Info</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-6">
                <LoanInfoForm 
                  mortgageData={pitchDeck.mortgage_data as MortgageDetailedData} 
                  onFieldChange={handleMortgageDataChange}
                />
              </TabsContent>
              
              <TabsContent value="preview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Preview</CardTitle>
                    <CardDescription>
                      This is how your pitch deck will appear when downloaded as a PDF
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-8 bg-white shadow-sm">
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold">{pitchDeck.title}</h2>
                        {pitchDeck.description && (
                          <p className="text-gray-600 mt-2">{pitchDeck.description}</p>
                        )}
                      </div>
                      
                      <div className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">Loan Details</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-2">Current Loan</h4>
                            <div className="space-y-1">
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Property Value:</span>
                                <span>${(pitchDeck.mortgage_data?.basicInfo?.propertyValue || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Loan Balance:</span>
                                <span>${(pitchDeck.mortgage_data?.basicInfo?.currentLoan?.balance || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Interest Rate:</span>
                                <span>{(pitchDeck.mortgage_data?.basicInfo?.currentLoan?.rate || 0).toFixed(3)}%</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Monthly Payment:</span>
                                <span>${(pitchDeck.mortgage_data?.basicInfo?.currentLoan?.payment || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Term:</span>
                                <span>{pitchDeck.mortgage_data?.basicInfo?.currentLoan?.term || 30} years</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Type:</span>
                                <span>{pitchDeck.mortgage_data?.basicInfo?.currentLoan?.type || "Conventional"}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Proposed Loan</h4>
                            <div className="space-y-1">
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Loan Amount:</span>
                                <span>${(pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.amount || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Interest Rate:</span>
                                <span>{(pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.rate || 0).toFixed(3)}%</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Monthly Payment:</span>
                                <span>${(pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.payment || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Term:</span>
                                <span>{pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.term || 30} years</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Type:</span>
                                <span>{pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.type || "Conventional"}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">Savings</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div className="border rounded-lg p-4 text-center bg-green-50">
                            <p className="text-sm text-gray-600">Monthly Savings</p>
                            <p className="text-2xl font-bold text-green-600">
                              ${pitchDeck.mortgage_data?.basicInfo?.savings?.monthly || 0}
                            </p>
                          </div>
                          <div className="border rounded-lg p-4 text-center bg-green-50">
                            <p className="text-sm text-gray-600">Lifetime Savings</p>
                            <p className="text-2xl font-bold text-green-600">
                              ${(pitchDeck.mortgage_data?.basicInfo?.savings?.lifetime || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Loan Comparison</h3>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border px-4 py-2 text-left">Feature</th>
                              <th className="border px-4 py-2 text-right">Current Loan</th>
                              <th className="border px-4 py-2 text-right">Proposed Loan</th>
                              <th className="border px-4 py-2 text-right">Difference</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Principal</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.basicInfo?.currentLoan?.balance || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.amount || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(
                                (pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.amount || 0) - 
                                (pitchDeck.mortgage_data?.basicInfo?.currentLoan?.balance || 0)
                              ).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Interest Rate</td>
                              <td className="border px-4 py-2 text-right">{(pitchDeck.mortgage_data?.basicInfo?.currentLoan?.rate || 0).toFixed(3)}%</td>
                              <td className="border px-4 py-2 text-right">{(pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.rate || 0).toFixed(3)}%</td>
                              <td className="border px-4 py-2 text-right">{(
                                (pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.rate || 0) - 
                                (pitchDeck.mortgage_data?.basicInfo?.currentLoan?.rate || 0)
                              ).toFixed(3)}%</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Monthly Payment</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.basicInfo?.currentLoan?.payment || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.payment || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(
                                (pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.payment || 0) - 
                                (pitchDeck.mortgage_data?.basicInfo?.currentLoan?.payment || 0)
                              ).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Term (years)</td>
                              <td className="border px-4 py-2 text-right">{pitchDeck.mortgage_data?.basicInfo?.currentLoan?.term || 0}</td>
                              <td className="border px-4 py-2 text-right">{pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.term || 0}</td>
                              <td className="border px-4 py-2 text-right">{
                                (pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.term || 0) - 
                                (pitchDeck.mortgage_data?.basicInfo?.currentLoan?.term || 0)
                              }</td>
                            </tr>
                            
                            {/* Add payment breakdown to the table if available */}
                            {pitchDeck.mortgage_data?.basicInfo?.currentLoan?.paymentBreakdown && (
                              <>
                                <tr>
                                  <td className="border px-4 py-2 font-medium">Principal Payment</td>
                                  <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.basicInfo?.currentLoan?.paymentBreakdown?.principal || 0).toLocaleString()}</td>
                                  <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.paymentBreakdown?.principal || 0).toLocaleString()}</td>
                                  <td className="border px-4 py-2 text-right">${(
                                    (pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.paymentBreakdown?.principal || 0) - 
                                    (pitchDeck.mortgage_data?.basicInfo?.currentLoan?.paymentBreakdown?.principal || 0)
                                  ).toLocaleString()}</td>
                                </tr>
                                <tr>
                                  <td className="border px-4 py-2 font-medium">Interest Payment</td>
                                  <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.basicInfo?.currentLoan?.paymentBreakdown?.interest || 0).toLocaleString()}</td>
                                  <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.paymentBreakdown?.interest || 0).toLocaleString()}</td>
                                  <td className="border px-4 py-2 text-right">${(
                                    (pitchDeck.mortgage_data?.basicInfo?.proposedLoan?.paymentBreakdown?.interest || 0) - 
                                    (pitchDeck.mortgage_data?.basicInfo?.currentLoan?.paymentBreakdown?.interest || 0)
                                  ).toLocaleString()}</td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-xs text-gray-500">The PDF download will include this content formatted professionally.</p>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Send to client modal */}
      <SendPitchDeckModal 
        isOpen={isSendModalOpen} 
        onClose={() => setIsSendModalOpen(false)}
        pitchDeck={id ? { 
          id, 
          title: pitchDeck.title, 
          description: pitchDeck.description,
          mortgage_data: pitchDeck.mortgage_data 
        } : null}
      />
    </MainLayout>
  );
};

export default PitchDeckBuilder;
