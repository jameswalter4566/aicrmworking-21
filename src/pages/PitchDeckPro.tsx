
import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useIndustry } from "@/context/IndustryContext";
import { useNavigate } from "react-router-dom";
import { Presentation, Download, Copy, ChevronRight, FileText, Plus, Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SendPitchDeckModal from "@/components/pitch-deck/SendPitchDeckModal";

// Define the Template interface that was missing
interface Template {
  name: string;
  slides: number;
  description: string;
}

// Update PitchDeck interface to match expected types
interface PitchDeck {
  id: string;
  title: string;
  description: string;
  template_type: string;
  created_at: string;
  last_sent_to?: string;
  last_sent_at?: string;
  client_info?: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  loan_officer_info?: any;
  mortgage_data?: any;
}

const PitchDeckPro = () => {
  const navigate = useNavigate();
  const { activeIndustry } = useIndustry();
  const [activeTab, setActiveTab] = useState("purchase");
  const [pitchDecks, setPitchDecks] = useState<PitchDeck[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [selectedPitchDeck, setSelectedPitchDeck] = useState<PitchDeck | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  useEffect(() => {
    if (activeIndustry !== "mortgage") {
      navigate("/settings");
    }
  }, [activeIndustry, navigate]);

  useEffect(() => {
    const fetchPitchDecks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('retrieve-pitch-deck', {
          body: { limit: 50 }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (data.success && Array.isArray(data.data)) {
          setPitchDecks(data.data);
        }
      } catch (error) {
        console.error("Error fetching pitch decks:", error);
        toast.error("Failed to load pitch decks");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPitchDecks();
  }, []);

  const templates = {
    purchase: [
      { name: "First-Time Homebuyer", slides: 12, description: "Perfect for clients new to the homebuying process" },
      { name: "Move-Up Buyer", slides: 14, description: "For clients selling their current home to buy a new one" },
      { name: "Investment Property", slides: 10, description: "Focused on ROI and investment benefits" },
    ],
    refinance: [
      { name: "Rate & Term Refinance", slides: 8, description: "Highlights interest savings and payment reduction" },
      { name: "Cash-Out Refinance", slides: 11, description: "Emphasizes home equity uses and benefits" },
      { name: "Debt Consolidation", slides: 9, description: "Shows financial benefits of consolidating high-interest debt" },
    ],
    specialized: [
      { name: "VA Loan Benefits", slides: 10, description: "Tailored for military veterans and service members" },
      { name: "FHA Loan Overview", slides: 9, description: "Great for first-time buyers with credit challenges" },
      { name: "Jumbo Loan Options", slides: 12, description: "For high-value properties exceeding conforming limits" },
    ],
  };

  const createPitchDeck = async (template: Template) => {
    setCreatingDeck(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-pitch-deck', {
        body: {
          action: 'save',
          pitchDeckData: {
            title: template.name,
            description: template.description,
            template_type: activeTab,
          }
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.success && data.data) {
        toast.success("Created new pitch deck");
        navigate(`/pitch-deck/builder/${data.data.id}`);
      }
    } catch (error) {
      console.error("Error creating pitch deck:", error);
      toast.error("Failed to create pitch deck");
    } finally {
      setCreatingDeck(false);
    }
  };

  const handleDownloadPDF = async (pitchDeckId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("save-pitch-deck", {
        body: {
          action: "get-pdf",
          pitchDeckId: pitchDeckId,
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.pdfData) {
        const deck = pitchDecks.find(d => d.id === pitchDeckId);
        const title = deck ? deck.title : "pitch-deck";
        
        const link = document.createElement("a");
        link.href = data.pdfData;
        link.download = `${title.replace(/\s+/g, "_")}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("PDF downloaded successfully");
      }
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      toast.error(`Failed to download PDF: ${error.message}`);
    }
  };

  const handleOpenSendModal = (pitchDeck: PitchDeck) => {
    setSelectedPitchDeck(pitchDeck);
    setIsSendModalOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Presentation className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">Pitch Deck Pro</h1>
          </div>
          <Badge className="bg-blue-600">Mortgage Pro Feature</Badge>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Create Professional Mortgage Presentations</CardTitle>
            <CardDescription>
              Choose from professionally designed templates to create compelling presentations for your clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="purchase" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="purchase">Purchase</TabsTrigger>
                <TabsTrigger value="refinance">Refinance</TabsTrigger>
                <TabsTrigger value="specialized">Specialized</TabsTrigger>
              </TabsList>
              
              {Object.keys(templates).map((category) => (
                <TabsContent key={category} value={category} className="space-y-4 pt-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    {templates[category as keyof typeof templates].map((template, idx) => (
                      <Card key={idx} className="overflow-hidden border-2 transition-all hover:border-blue-500 hover:shadow-md">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-3"></div>
                        <CardContent className="p-4">
                          <div className="h-36 flex items-center justify-center bg-gray-100 rounded-md mb-4">
                            <FileText className="h-12 w-12 text-gray-400" />
                          </div>
                          <h3 className="font-semibold text-lg">{template.name}</h3>
                          <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{template.slides} slides</span>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                className="h-8 px-2 bg-blue-500 hover:bg-blue-600 text-white"
                                onClick={() => createPitchDeck(template)}
                                disabled={creatingDeck}
                              >
                                {creatingDeck ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                                Create
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>My Presentations</CardTitle>
            <CardDescription>
              Access and manage your previously created presentations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : pitchDecks.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {pitchDecks.map((deck) => (
                  <Card key={deck.id} className="overflow-hidden hover:shadow-md">
                    <div className={`h-2 ${
                      deck.template_type === 'purchase' ? 'bg-blue-500' :
                      deck.template_type === 'refinance' ? 'bg-green-500' :
                      'bg-purple-500'
                    }`} />
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-lg">
                        {deck.title}
                        {deck.client_info?.lastName && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({deck.client_info.lastName})
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">{deck.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {deck.template_type.charAt(0).toUpperCase() + deck.template_type.slice(1)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(deck.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {deck.last_sent_to && (
                        <div className="mt-2 text-xs text-gray-500">
                          <span>Last sent to: {deck.last_sent_to}</span>
                          {deck.last_sent_at && (
                            <span className="block">
                              on {new Date(deck.last_sent_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 pt-0 pb-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="px-2 py-0 h-8"
                        onClick={() => handleDownloadPDF(deck.id)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="px-2 py-0 h-8"
                        onClick={() => handleOpenSendModal(deck)}
                        title="Send to Client"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="px-2 py-0 h-8"
                        onClick={() => navigate(`/pitch-deck/builder/${deck.id}`)}
                        title="Edit Pitch Deck"
                      >
                        Edit <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 border border-dashed rounded-md bg-gray-50">
                <div className="text-center">
                  <p className="text-gray-500">No saved presentations yet</p>
                  <Button variant="link" className="mt-2" onClick={() => document.getElementById('purchase-tab')?.click()}>
                    Create your first presentation
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <SendPitchDeckModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)} 
        pitchDeck={selectedPitchDeck}
      />
    </MainLayout>
  );
};

export default PitchDeckPro;
