
import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import PropertyInsightsSection from "@/components/pitch-deck/PropertyInsightsSection";
import LoanComparisonSection from "@/components/pitch-deck/LoanComparisonSection";
import DocumentUploadSection from "@/components/pitch-deck/DocumentUploadSection";

// Define the PitchDeck type including the slug property
interface PitchDeck {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  mortgage_data: {
    currentLoan?: {
      balance: number;
      rate: number;
      payment: number;
      term: number;
      type: string;
      paymentBreakdown?: {
        principal: number;
        interest: number;
        taxes: number;
        insurance: number;
      };
    };
    proposedLoan?: {
      amount: number;
      rate: number;
      payment: number;
      term: number;
      type: string;
      paymentBreakdown?: {
        principal: number;
        interest: number;
        taxes: number;
        insurance: number;
      };
    };
    savings?: {
      monthly: number;
      lifetime: number;
    };
    propertyValue?: number;
  };
  created_at: string;
  updated_at: string;
}

const YourHomeSolution = () => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [pitchDeck, setPitchDeck] = useState<PitchDeck | null>(null);
  
  // Extract pitch deck ID from URL path
  useEffect(() => {
    const fetchPitchDeck = async () => {
      setLoading(true);
      
      try {
        let pitchDeckId = id;
        
        // Try to extract ID from various URL formats
        if (!pitchDeckId) {
          const path = location.pathname;
          
          // Format: /your-home-solution/ID1234
          if (path.includes('/your-home-solution/')) {
            const parts = path.split('/');
            pitchDeckId = parts[parts.length - 1];
          }
          // Format: /yourhomesolutionID1234
          else if (path.includes('/yourhomesolution')) {
            const match = path.match(/yourhomesolution(.*)/);
            if (match && match[1]) {
              pitchDeckId = match[1];
            }
          }
        }
        
        if (!pitchDeckId) {
          throw new Error("No identifier found for the pitch deck");
        }
        
        console.log("Fetching pitch deck by ID:", pitchDeckId);
        const { data, error } = await supabase
          .from('pitch_decks')
          .select('*')
          .eq('id', pitchDeckId)
          .single();
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (data) {
          console.log("Pitch deck found:", data);
          
          // Ensure we have default payment breakdown data if it's missing
          const enhancedData = {
            ...data,
            mortgage_data: {
              ...data.mortgage_data,
              propertyValue: data.mortgage_data.propertyValue || (data.mortgage_data.currentLoan?.balance ? data.mortgage_data.currentLoan.balance * 1.25 : 500000),
              currentLoan: data.mortgage_data.currentLoan ? {
                ...data.mortgage_data.currentLoan,
                paymentBreakdown: data.mortgage_data.currentLoan.paymentBreakdown || calculateDefaultPaymentBreakdown(
                  data.mortgage_data.currentLoan.payment,
                  data.mortgage_data.currentLoan.balance,
                  data.mortgage_data.currentLoan.rate,
                  data.mortgage_data.currentLoan.term
                )
              } : undefined,
              proposedLoan: data.mortgage_data.proposedLoan ? {
                ...data.mortgage_data.proposedLoan,
                paymentBreakdown: data.mortgage_data.proposedLoan.paymentBreakdown || calculateDefaultPaymentBreakdown(
                  data.mortgage_data.proposedLoan.payment,
                  data.mortgage_data.proposedLoan.amount,
                  data.mortgage_data.proposedLoan.rate,
                  data.mortgage_data.proposedLoan.term
                )
              } : undefined
            }
          };
          
          setPitchDeck(enhancedData as PitchDeck);
        }
      } catch (error: any) {
        console.error("Error fetching pitch deck:", error);
        toast.error(`Failed to load pitch deck: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPitchDeck();
  }, [id, location.pathname]);
  
  // Calculate default payment breakdown if not provided
  const calculateDefaultPaymentBreakdown = (
    totalPayment: number,
    loanAmount: number,
    interestRate: number,
    term: number
  ) => {
    // Simple estimation - in reality this would be more complex
    const monthlyRate = interestRate / 100 / 12;
    const totalMonths = term * 12;
    const principalAndInterest = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
                               (Math.pow(1 + monthlyRate, totalMonths) - 1);
    
    // Estimate insurance and taxes based on typical percentages
    const taxes = loanAmount * 0.015 / 12; // Approx 1.5% of loan amount annually
    const insurance = loanAmount * 0.0035 / 12; // Approx 0.35% of loan amount annually
    
    // Calculate principal and interest split based on amortization
    const interest = loanAmount * monthlyRate;
    const principal = principalAndInterest - interest;
    
    return {
      principal: Math.round(principal),
      interest: Math.round(interest),
      taxes: Math.round(taxes),
      insurance: Math.round(insurance)
    };
  };
  
  const handleDownloadPDF = async () => {
    if (!pitchDeck) return;
    
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-pitch-deck", {
        body: {
          action: "get-pdf",
          pitchDeckId: pitchDeck.id,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading your home solution...</p>
        </div>
      </div>
    );
  }

  if (!pitchDeck) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Mortgage Proposal Not Found</h1>
          <p className="mb-6">The mortgage proposal you're looking for could not be found.</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const currentLoan = pitchDeck.mortgage_data.currentLoan;
  const proposedLoan = pitchDeck.mortgage_data.proposedLoan;
  const savings = pitchDeck.mortgage_data.savings;
  const propertyValue = pitchDeck.mortgage_data.propertyValue || (currentLoan ? currentLoan.balance * 1.25 : 0);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold">{pitchDeck?.title}</h1>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Downloading..." : "Download PDF"}
          </Button>
        </div>
        
        {pitchDeck?.description && (
          <p className="text-gray-600 mb-8">{pitchDeck.description}</p>
        )}
        
        {/* Property Insights Section with Current Loan Details */}
        {currentLoan && currentLoan.paymentBreakdown && (
          <PropertyInsightsSection
            propertyValue={propertyValue}
            loanBalance={currentLoan.balance}
            monthlyPayment={currentLoan.payment}
            paymentBreakdown={currentLoan.paymentBreakdown}
          />
        )}
        
        {/* Loan Comparison Section */}
        {currentLoan && proposedLoan && savings && 
         currentLoan.paymentBreakdown && proposedLoan.paymentBreakdown && (
          <LoanComparisonSection
            currentLoan={{
              ...currentLoan,
              paymentBreakdown: currentLoan.paymentBreakdown
            }}
            proposedLoan={{
              ...proposedLoan,
              balance: proposedLoan.amount,
              paymentBreakdown: proposedLoan.paymentBreakdown
            }}
            savings={savings}
          />
        )}
        
        {/* Original Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Current Loan</h4>
                <div className="space-y-1">
                  {pitchDeck.mortgage_data?.currentLoan && (
                    <>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Loan Balance:</span>
                        <span>{formatCurrency(pitchDeck.mortgage_data.currentLoan.balance)}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Interest Rate:</span>
                        <span>{pitchDeck.mortgage_data.currentLoan.rate.toFixed(3)}%</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Monthly Payment:</span>
                        <span>{formatCurrency(pitchDeck.mortgage_data.currentLoan.payment)}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Term:</span>
                        <span>{pitchDeck.mortgage_data.currentLoan.term} years</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span>{pitchDeck.mortgage_data.currentLoan.type}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Proposed Loan</h4>
                <div className="space-y-1">
                  {pitchDeck.mortgage_data?.proposedLoan && (
                    <>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Loan Amount:</span>
                        <span>{formatCurrency(pitchDeck.mortgage_data.proposedLoan.amount)}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Interest Rate:</span>
                        <span>{pitchDeck.mortgage_data.proposedLoan.rate.toFixed(3)}%</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Monthly Payment:</span>
                        <span>{formatCurrency(pitchDeck.mortgage_data.proposedLoan.payment)}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Term:</span>
                        <span>{pitchDeck.mortgage_data.proposedLoan.term} years</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span>{pitchDeck.mortgage_data.proposedLoan.type}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {pitchDeck.mortgage_data?.savings && (
                <>
                  <div className="border rounded-lg p-4 text-center bg-green-50">
                    <p className="text-sm text-gray-600">Monthly Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(pitchDeck.mortgage_data.savings.monthly)}
                    </p>
                  </div>
                  <div className="border rounded-lg p-4 text-center bg-green-50">
                    <p className="text-sm text-gray-600">Lifetime Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(pitchDeck.mortgage_data.savings.lifetime)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Loan Comparison</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {pitchDeck.mortgage_data?.currentLoan && pitchDeck.mortgage_data?.proposedLoan && (
                    <>
                      <tr>
                        <td className="border px-4 py-2 font-medium">Principal</td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(pitchDeck.mortgage_data.currentLoan.balance)}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(pitchDeck.mortgage_data.proposedLoan.amount)}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(
                            pitchDeck.mortgage_data.proposedLoan.amount - 
                            pitchDeck.mortgage_data.currentLoan.balance
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium">Interest Rate</td>
                        <td className="border px-4 py-2 text-right">
                          {pitchDeck.mortgage_data.currentLoan.rate.toFixed(3)}%
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {pitchDeck.mortgage_data.proposedLoan.rate.toFixed(3)}%
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {(
                            pitchDeck.mortgage_data.proposedLoan.rate - 
                            pitchDeck.mortgage_data.currentLoan.rate
                          ).toFixed(3)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium">Monthly Payment</td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(pitchDeck.mortgage_data.currentLoan.payment)}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(pitchDeck.mortgage_data.proposedLoan.payment)}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(
                            pitchDeck.mortgage_data.proposedLoan.payment - 
                            pitchDeck.mortgage_data.currentLoan.payment
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium">Term (years)</td>
                        <td className="border px-4 py-2 text-right">
                          {pitchDeck.mortgage_data.currentLoan.term}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {pitchDeck.mortgage_data.proposedLoan.term}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {
                            pitchDeck.mortgage_data.proposedLoan.term - 
                            pitchDeck.mortgage_data.currentLoan.term
                          }
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Document Upload Section */}
        <DocumentUploadSection pitchDeckId={pitchDeck.id} />
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            This mortgage comparison was generated on {new Date(pitchDeck.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default YourHomeSolution;
