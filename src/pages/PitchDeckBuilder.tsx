
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

// Default empty pitch deck structure
const defaultPitchDeck = {
  title: "New Mortgage Proposal",
  description: "",
  template_type: "purchase",
  mortgage_data: {
    currentLoan: {
      balance: 200000,
      rate: 4.5,
      payment: 1013,
      term: 30,
      type: "Conventional"
    },
    proposedLoan: {
      amount: 200000,
      rate: 3.5,
      payment: 898,
      term: 30,
      type: "Conventional"
    },
    savings: {
      monthly: 115,
      lifetime: 41400
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
          } else {
            // Ensure all required nested objects exist
            if (!fetchedDeck.mortgage_data.currentLoan) {
              fetchedDeck.mortgage_data.currentLoan = defaultPitchDeck.mortgage_data.currentLoan;
            }
            if (!fetchedDeck.mortgage_data.proposedLoan) {
              fetchedDeck.mortgage_data.proposedLoan = defaultPitchDeck.mortgage_data.proposedLoan;
            }
            if (!fetchedDeck.mortgage_data.savings) {
              fetchedDeck.mortgage_data.savings = defaultPitchDeck.mortgage_data.savings;
            }
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
    if (!pitchDeck?.mortgage_data) return;
    
    // Calculate current loan payment if not already set
    const currentLoan = pitchDeck.mortgage_data.currentLoan;
    if (currentLoan && currentLoan.balance && currentLoan.rate && currentLoan.term) {
      const monthlyRate = currentLoan.rate / 100 / 12;
      const numPayments = currentLoan.term * 12;
      const payment = (currentLoan.balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments));
      
      if (Math.abs(payment - currentLoan.payment) > 1) {
        setPitchDeck(prev => ({
          ...prev,
          mortgage_data: {
            ...prev.mortgage_data,
            currentLoan: {
              ...prev.mortgage_data.currentLoan,
              payment: Math.round(payment)
            }
          }
        }));
      }
    }
    
    // Calculate proposed loan payment if not already set
    const proposedLoan = pitchDeck.mortgage_data.proposedLoan;
    if (proposedLoan && proposedLoan.amount && proposedLoan.rate && proposedLoan.term) {
      const monthlyRate = proposedLoan.rate / 100 / 12;
      const numPayments = proposedLoan.term * 12;
      const payment = (proposedLoan.amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments));
      
      if (Math.abs(payment - proposedLoan.payment) > 1) {
        setPitchDeck(prev => ({
          ...prev,
          mortgage_data: {
            ...prev.mortgage_data,
            proposedLoan: {
              ...prev.mortgage_data.proposedLoan,
              payment: Math.round(payment)
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
          savings: {
            monthly: monthlySavings,
            lifetime: lifetimeSavings
          }
        }
      }));
    }
  }, [
    pitchDeck?.mortgage_data?.currentLoan?.balance,
    pitchDeck?.mortgage_data?.currentLoan?.rate,
    pitchDeck?.mortgage_data?.currentLoan?.term,
    pitchDeck?.mortgage_data?.proposedLoan?.amount,
    pitchDeck?.mortgage_data?.proposedLoan?.rate,
    pitchDeck?.mortgage_data?.proposedLoan?.term
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
          ...(prev[section as keyof typeof prev] as object || {}), // Fix: Cast to object and provide default empty object
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
    setPitchDeck(prev => ({
      ...prev,
      mortgage_data: {
        ...prev.mortgage_data,
        [section]: {
          ...(prev.mortgage_data?.[section as keyof typeof prev.mortgage_data] || {}), // Fix: Provide default empty object
          [field]: parseFloat(value) || 0
        }
      }
    }));
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
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="info">Loan Info</TabsTrigger>
                <TabsTrigger value="comparison">Loan Comparison</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                        Current Loan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Loan Balance</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={pitchDeck.mortgage_data?.currentLoan?.balance || ''}
                            onChange={(e) => handleMortgageDataChange('currentLoan', 'balance', e.target.value)}
                            className="pl-7"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                        <Input
                          type="number"
                          step="0.125"
                          value={pitchDeck.mortgage_data?.currentLoan?.rate || ''}
                          onChange={(e) => handleMortgageDataChange('currentLoan', 'rate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Term (Years)</label>
                        <Input
                          type="number"
                          value={pitchDeck.mortgage_data?.currentLoan?.term || ''}
                          onChange={(e) => handleMortgageDataChange('currentLoan', 'term', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Loan Type</label>
                        <Input
                          type="text"
                          value={pitchDeck.mortgage_data?.currentLoan?.type || ''}
                          onChange={(e) => handleMortgageDataChange('currentLoan', 'type', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Monthly Payment</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={pitchDeck.mortgage_data?.currentLoan?.payment || ''}
                            onChange={(e) => handleMortgageDataChange('currentLoan', 'payment', e.target.value)}
                            className="pl-7"
                            disabled
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        Proposed Loan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Loan Amount</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={pitchDeck.mortgage_data?.proposedLoan?.amount || ''}
                            onChange={(e) => handleMortgageDataChange('proposedLoan', 'amount', e.target.value)}
                            className="pl-7"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                        <Input
                          type="number"
                          step="0.125"
                          value={pitchDeck.mortgage_data?.proposedLoan?.rate || ''}
                          onChange={(e) => handleMortgageDataChange('proposedLoan', 'rate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Term (Years)</label>
                        <Input
                          type="number"
                          value={pitchDeck.mortgage_data?.proposedLoan?.term || ''}
                          onChange={(e) => handleMortgageDataChange('proposedLoan', 'term', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Loan Type</label>
                        <Input
                          type="text"
                          value={pitchDeck.mortgage_data?.proposedLoan?.type || ''}
                          onChange={(e) => handleMortgageDataChange('proposedLoan', 'type', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Monthly Payment</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={pitchDeck.mortgage_data?.proposedLoan?.payment || ''}
                            onChange={(e) => handleMortgageDataChange('proposedLoan', 'payment', e.target.value)}
                            className="pl-7"
                            disabled
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="comparison" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Savings Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="bg-gray-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Monthly Savings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            ${pitchDeck.mortgage_data?.savings?.monthly || 0}
                          </div>
                          <p className="text-sm text-gray-600">per month</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gray-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Lifetime Savings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            ${(pitchDeck.mortgage_data?.savings?.lifetime || 0).toLocaleString()}
                          </div>
                          <p className="text-sm text-gray-600">over loan term</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gray-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Rate Difference</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {(
                              (pitchDeck.mortgage_data?.currentLoan?.rate || 0) -
                              (pitchDeck.mortgage_data?.proposedLoan?.rate || 0)
                            ).toFixed(3)}%
                          </div>
                          <p className="text-sm text-gray-600">lower rate</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="mt-8">
                      <h3 className="font-medium mb-4">Detailed Comparison</h3>
                      <div className="overflow-x-auto">
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
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.currentLoan?.balance || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.proposedLoan?.amount || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(
                                (pitchDeck.mortgage_data?.proposedLoan?.amount || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.balance || 0)
                              ).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Interest Rate</td>
                              <td className="border px-4 py-2 text-right">{(pitchDeck.mortgage_data?.currentLoan?.rate || 0).toFixed(3)}%</td>
                              <td className="border px-4 py-2 text-right">{(pitchDeck.mortgage_data?.proposedLoan?.rate || 0).toFixed(3)}%</td>
                              <td className="border px-4 py-2 text-right">{(
                                (pitchDeck.mortgage_data?.proposedLoan?.rate || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.rate || 0)
                              ).toFixed(3)}%</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Monthly Payment</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.currentLoan?.payment || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.proposedLoan?.payment || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(
                                (pitchDeck.mortgage_data?.proposedLoan?.payment || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.payment || 0)
                              ).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Term (years)</td>
                              <td className="border px-4 py-2 text-right">{pitchDeck.mortgage_data?.currentLoan?.term || 0}</td>
                              <td className="border px-4 py-2 text-right">{pitchDeck.mortgage_data?.proposedLoan?.term || 0}</td>
                              <td className="border px-4 py-2 text-right">{
                                (pitchDeck.mortgage_data?.proposedLoan?.term || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.term || 0)
                              }</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                                <span className="text-gray-600">Loan Balance:</span>
                                <span>${(pitchDeck.mortgage_data?.currentLoan?.balance || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Interest Rate:</span>
                                <span>{(pitchDeck.mortgage_data?.currentLoan?.rate || 0).toFixed(3)}%</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Monthly Payment:</span>
                                <span>${(pitchDeck.mortgage_data?.currentLoan?.payment || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Term:</span>
                                <span>{pitchDeck.mortgage_data?.currentLoan?.term || 30} years</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Type:</span>
                                <span>{pitchDeck.mortgage_data?.currentLoan?.type || "Conventional"}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Proposed Loan</h4>
                            <div className="space-y-1">
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Loan Amount:</span>
                                <span>${(pitchDeck.mortgage_data?.proposedLoan?.amount || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Interest Rate:</span>
                                <span>{(pitchDeck.mortgage_data?.proposedLoan?.rate || 0).toFixed(3)}%</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Monthly Payment:</span>
                                <span>${(pitchDeck.mortgage_data?.proposedLoan?.payment || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Term:</span>
                                <span>{pitchDeck.mortgage_data?.proposedLoan?.term || 30} years</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Type:</span>
                                <span>{pitchDeck.mortgage_data?.proposedLoan?.type || "Conventional"}</span>
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
                              ${pitchDeck.mortgage_data?.savings?.monthly || 0}
                            </p>
                          </div>
                          <div className="border rounded-lg p-4 text-center bg-green-50">
                            <p className="text-sm text-gray-600">Lifetime Savings</p>
                            <p className="text-2xl font-bold text-green-600">
                              ${(pitchDeck.mortgage_data?.savings?.lifetime || 0).toLocaleString()}
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
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.currentLoan?.balance || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.proposedLoan?.amount || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(
                                (pitchDeck.mortgage_data?.proposedLoan?.amount || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.balance || 0)
                              ).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Interest Rate</td>
                              <td className="border px-4 py-2 text-right">{(pitchDeck.mortgage_data?.currentLoan?.rate || 0).toFixed(3)}%</td>
                              <td className="border px-4 py-2 text-right">{(pitchDeck.mortgage_data?.proposedLoan?.rate || 0).toFixed(3)}%</td>
                              <td className="border px-4 py-2 text-right">{(
                                (pitchDeck.mortgage_data?.proposedLoan?.rate || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.rate || 0)
                              ).toFixed(3)}%</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Monthly Payment</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.currentLoan?.payment || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.proposedLoan?.payment || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(
                                (pitchDeck.mortgage_data?.proposedLoan?.payment || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.payment || 0)
                              ).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Term (years)</td>
                              <td className="border px-4 py-2 text-right">{pitchDeck.mortgage_data?.currentLoan?.term || 0}</td>
                              <td className="border px-4 py-2 text-right">{pitchDeck.mortgage_data?.proposedLoan?.term || 0}</td>
                              <td className="border px-4 py-2 text-right">{
                                (pitchDeck.mortgage_data?.proposedLoan?.term || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.term || 0)
                              }</td>
                            </tr>
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
          description: pitchDeck.description 
        } : null}
      />
    </MainLayout>
  );
};

export default PitchDeckBuilder;
