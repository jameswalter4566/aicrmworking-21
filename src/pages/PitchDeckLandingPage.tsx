import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PhoneCall, Mail, Download } from "lucide-react";

interface PitchDeckData {
  id: string;
  title: string;
  description?: string;
  slug: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  mortgage_data: {
    currentLoan: {
      balance: number;
      rate: number;
      payment: number;
      term: number;
      type: string;
    };
    proposedLoan: {
      amount: number;
      rate: number;
      payment: number;
      term: number;
      type: string;
    };
    savings: {
      monthly: number;
      lifetime: number;
    };
  };
  lead_id?: string;
  template_type?: string;
}

interface UserProfile {
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  job_title?: string;
}

const PitchDeckLandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [pitchDeck, setPitchDeck] = useState<PitchDeckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentProfile, setAgentProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPitchDeck = async () => {
      try {
        // Fetch the pitch deck based on the slug
        const { data: deckData, error: deckError } = await supabase
          .from('pitch_decks')
          .select('*')
          .eq('slug', slug)
          .single();
        
        if (deckError) {
          throw new Error(deckError.message);
        }
        
        if (!deckData) {
          throw new Error('Pitch deck not found');
        }

        // Type checking and conversion
        if (!deckData.slug) {
          throw new Error('Pitch deck slug is missing');
        }
        
        // Safely convert to PitchDeckData type with type assertion
        const typedPitchDeck = {
          ...deckData,
          mortgage_data: deckData.mortgage_data || {
            currentLoan: {
              balance: 0,
              rate: 0,
              payment: 0,
              term: 0,
              type: ""
            },
            proposedLoan: {
              amount: 0,
              rate: 0,
              payment: 0,
              term: 0,
              type: ""
            },
            savings: {
              monthly: 0,
              lifetime: 0
            }
          }
        } as PitchDeckData;
        
        setPitchDeck(typedPitchDeck);
        
        // Fetch the agent profile
        if (deckData.created_by) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', deckData.created_by)
            .single();
          
          if (!profileError && profileData) {
            setAgentProfile(profileData as UserProfile);
          }
        }
      } catch (err: any) {
        console.error('Error fetching pitch deck:', err);
        setError(err.message || 'Failed to load this proposal');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPitchDeck();
  }, [slug]);
  
  const handleDownloadPDF = async () => {
    if (!pitchDeck) return;
    
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
      }
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Loading your mortgage proposal...</p>
        </div>
      </div>
    );
  }
  
  if (error || !pitchDeck) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Proposal Not Found</h2>
          <p>{error || "The requested mortgage proposal does not exist or has been removed."}</p>
        </div>
      </div>
    );
  }
  
  const { currentLoan, proposedLoan, savings } = pitchDeck.mortgage_data;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">Your Home Solution</h1>
            <p className="text-gray-600">Personalized Mortgage Proposal</p>
          </div>
          
          {agentProfile && (
            <div className="text-right">
              <p className="font-medium">
                {agentProfile.first_name} {agentProfile.last_name}
              </p>
              <p className="text-sm text-gray-600">
                {agentProfile.job_title}{agentProfile.company ? `, ${agentProfile.company}` : ''}
              </p>
            </div>
          )}
        </div>
      </header>
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-4">{pitchDeck.title}</h2>
          {pitchDeck.description && (
            <p className="text-xl opacity-90 mb-8">{pitchDeck.description}</p>
          )}
          <Button onClick={handleDownloadPDF} className="bg-white text-blue-800 hover:bg-gray-100 hover:text-blue-900 flex items-center gap-2">
            <Download size={16} />
            Download PDF Version
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Current Situation */}
          <Card className="shadow-lg border-t-4 border-blue-600">
            <div className="bg-blue-50 p-6 rounded-t-lg">
              <h3 className="text-2xl font-bold text-blue-800 mb-2">Current Situation</h3>
              <p className="text-gray-600">Your current mortgage overview</p>
            </div>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Loan Balance</span>
                  <span className="font-medium">${Number(currentLoan?.balance || 0).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Interest Rate</span>
                  <span className="font-medium">{Number(currentLoan?.rate || 0).toFixed(3)}%</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Monthly Payment</span>
                  <span className="font-medium">${Number(currentLoan?.payment || 0).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Loan Term</span>
                  <span className="font-medium">{currentLoan?.term || 30} years</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Loan Type</span>
                  <span className="font-medium">{currentLoan?.type || "Conventional"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Proposed Solution */}
          <Card className="shadow-lg border-t-4 border-green-600">
            <div className="bg-green-50 p-6 rounded-t-lg">
              <h3 className="text-2xl font-bold text-green-800 mb-2">Proposed Solution</h3>
              <p className="text-gray-600">Our recommended mortgage solution</p>
            </div>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Loan Amount</span>
                  <span className="font-medium">${Number(proposedLoan?.amount || 0).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Interest Rate</span>
                  <span className="font-medium text-green-700">{Number(proposedLoan?.rate || 0).toFixed(3)}%</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Monthly Payment</span>
                  <span className="font-medium">${Number(proposedLoan?.payment || 0).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Loan Term</span>
                  <span className="font-medium">{proposedLoan?.term || 30} years</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Loan Type</span>
                  <span className="font-medium">{proposedLoan?.type || "Conventional"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Savings */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center mb-8">Your Potential Savings</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-green-50 border-green-200 text-center p-8">
              <h4 className="text-lg font-medium text-green-800 mb-2">Monthly Savings</h4>
              <p className="text-3xl font-bold text-green-600">
                ${Number(savings?.monthly || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-2">per month</p>
            </Card>
            
            <Card className="bg-green-50 border-green-200 text-center p-8">
              <h4 className="text-lg font-medium text-green-800 mb-2">Lifetime Savings</h4>
              <p className="text-3xl font-bold text-green-600">
                ${Number(savings?.lifetime || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-2">over the life of your loan</p>
            </Card>
          </div>
        </div>
        
        {/* Comparison Table */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6">Detailed Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-3 text-left">Feature</th>
                  <th className="border px-4 py-3 text-right">Current Loan</th>
                  <th className="border px-4 py-3 text-right">Proposed Loan</th>
                  <th className="border px-4 py-3 text-right">Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-4 py-3 font-medium">Principal</td>
                  <td className="border px-4 py-3 text-right">${Number(currentLoan?.balance || 0).toLocaleString()}</td>
                  <td className="border px-4 py-3 text-right">${Number(proposedLoan?.amount || 0).toLocaleString()}</td>
                  <td className="border px-4 py-3 text-right">
                    ${Number((proposedLoan?.amount || 0) - (currentLoan?.balance || 0)).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="border px-4 py-3 font-medium">Interest Rate</td>
                  <td className="border px-4 py-3 text-right">{Number(currentLoan?.rate || 0).toFixed(3)}%</td>
                  <td className="border px-4 py-3 text-right">{Number(proposedLoan?.rate || 0).toFixed(3)}%</td>
                  <td className="border px-4 py-3 text-right">
                    {Number((proposedLoan?.rate || 0) - (currentLoan?.rate || 0)).toFixed(3)}%
                  </td>
                </tr>
                <tr>
                  <td className="border px-4 py-3 font-medium">Monthly Payment</td>
                  <td className="border px-4 py-3 text-right">${Number(currentLoan?.payment || 0).toLocaleString()}</td>
                  <td className="border px-4 py-3 text-right">${Number(proposedLoan?.payment || 0).toLocaleString()}</td>
                  <td className="border px-4 py-3 text-right">
                    ${Number((proposedLoan?.payment || 0) - (currentLoan?.payment || 0)).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="border px-4 py-3 font-medium">Term (years)</td>
                  <td className="border px-4 py-3 text-right">{Number(currentLoan?.term || 0)}</td>
                  <td className="border px-4 py-3 text-right">{Number(proposedLoan?.term || 0)}</td>
                  <td className="border px-4 py-3 text-right">
                    {Number((proposedLoan?.term || 0) - (currentLoan?.term || 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Contact Section */}
        {agentProfile && (
          <div className="mt-12 bg-blue-50 rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-bold mb-6 text-center">Questions? Get in Touch</h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {agentProfile.email && (
                <Button variant="outline" className="flex items-center gap-2">
                  <Mail size={18} />
                  <a href={`mailto:${agentProfile.email}`}>Email Me</a>
                </Button>
              )}
              <Button variant="outline" className="flex items-center gap-2">
                <PhoneCall size={18} />
                Schedule a Call
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm opacity-70">
            Disclaimer: This proposal is for informational purposes only. 
            The actual loan terms and conditions may vary based on final underwriting approval. 
            Interest rates subject to change without notice.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PitchDeckLandingPage;
