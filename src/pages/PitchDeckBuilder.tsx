
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Save, Trash, Search, UserPlus, Home, DollarSign, 
  Calculator, FileText, Download, Eye, Loader2, X, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MortgageData {
  currentLoan?: {
    balance?: number;
    rate?: number;
    payment?: number;
    term?: number;
    type?: string;
  };
  proposedLoan?: {
    amount?: number;
    rate?: number;
    payment?: number;
    term?: number;
    type?: string;
  };
  savings?: {
    monthly?: number;
    lifetime?: number;
  };
  property?: {
    value?: number;
    address?: string;
  };
}

interface PitchDeck {
  id: string;
  title: string;
  description: string;
  lead_id: string | null;
  mortgage_data: MortgageData;
  template_type: string;
  created_at: string;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  mortgageData: any;
}

const PitchDeckBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  
  const [pitchDeck, setPitchDeck] = useState<PitchDeck>({
    id: id || "",
    title: "",
    description: "",
    lead_id: null,
    mortgage_data: {
      currentLoan: {
        balance: 0,
        rate: 0,
        payment: 0,
        term: 30,
        type: "Conventional"
      },
      proposedLoan: {
        amount: 0,
        rate: 0,
        payment: 0,
        term: 30,
        type: "Conventional"
      },
      savings: {
        monthly: 0,
        lifetime: 0
      },
      property: {
        value: 0,
        address: ""
      }
    },
    template_type: "purchase",
    created_at: new Date().toISOString()
  });
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (id) {
      fetchPitchDeck();
    } else {
      setLoading(false);
    }
  }, [id]);

  // Calculate mortgage payments and savings when data changes
  useEffect(() => {
    if (pitchDeck.mortgage_data.currentLoan && pitchDeck.mortgage_data.proposedLoan) {
      const currentPayment = calculateMonthlyPayment(
        pitchDeck.mortgage_data.currentLoan.balance || 0,
        pitchDeck.mortgage_data.currentLoan.rate || 0,
        pitchDeck.mortgage_data.currentLoan.term || 30
      );
      
      const proposedPayment = calculateMonthlyPayment(
        pitchDeck.mortgage_data.proposedLoan.amount || 0,
        pitchDeck.mortgage_data.proposedLoan.rate || 0,
        pitchDeck.mortgage_data.proposedLoan.term || 30
      );
      
      const monthlySavings = currentPayment - proposedPayment;
      const lifetimeSavings = monthlySavings * (pitchDeck.mortgage_data.proposedLoan.term || 30) * 12;
      
      setPitchDeck(prev => ({
        ...prev,
        mortgage_data: {
          ...prev.mortgage_data,
          currentLoan: {
            ...prev.mortgage_data.currentLoan,
            payment: currentPayment
          },
          proposedLoan: {
            ...prev.mortgage_data.proposedLoan,
            payment: proposedPayment
          },
          savings: {
            monthly: monthlySavings,
            lifetime: lifetimeSavings
          }
        }
      }));
    }
  }, [
    pitchDeck.mortgage_data.currentLoan?.balance,
    pitchDeck.mortgage_data.currentLoan?.rate,
    pitchDeck.mortgage_data.currentLoan?.term,
    pitchDeck.mortgage_data.proposedLoan?.amount,
    pitchDeck.mortgage_data.proposedLoan?.rate,
    pitchDeck.mortgage_data.proposedLoan?.term
  ]);

  const fetchPitchDeck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-pitch-deck', {
        body: { action: 'get', pitchDeckId: id }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.success && data.data) {
        setPitchDeck(data.data);
        
        // If there's a lead ID, fetch the lead details
        if (data.data.lead_id) {
          fetchLeadDetails(data.data.lead_id);
        }
      }
    } catch (error) {
      console.error("Error fetching pitch deck:", error);
      toast.error("Failed to load pitch deck");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadDetails = async (leadId: string) => {
    try {
      const { data: leadsResponse, error: leadsError } = await supabase.functions.invoke('retrieve-leads', {
        body: { leadId }
      });
      
      if (leadsError) {
        throw new Error(leadsError);
      }
      
      if (leadsResponse.success && leadsResponse.data && leadsResponse.data.length > 0) {
        const lead = leadsResponse.data[0];
        setSelectedLead({
          id: lead.id,
          firstName: lead.firstName || '',
          lastName: lead.lastName || '',
          email: lead.email || '',
          phone: lead.phone1 || '',
          propertyAddress: lead.propertyAddress || '',
          mortgageData: lead.mortgageData || {}
        });
      }
    } catch (error) {
      console.error("Error fetching lead details:", error);
    }
  };

  const searchLeads = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-pitch-deck', {
        body: { action: 'search-leads', searchQuery: searchQuery }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error("Error searching leads:", error);
      toast.error("Failed to search leads");
    } finally {
      setSearching(false);
    }
  };

  const selectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSearchOpen(false);
    
    // Update pitch deck with lead data
    setPitchDeck(prev => ({
      ...prev,
      lead_id: lead.id,
      mortgage_data: {
        ...prev.mortgage_data,
        property: {
          ...prev.mortgage_data.property,
          address: lead.propertyAddress || ''
        },
        // If lead has mortgage data, use it for current loan
        ...(lead.mortgageData?.loan ? {
          currentLoan: {
            balance: parseFloat(lead.mortgageData.loan.balance || '0'),
            rate: parseFloat(lead.mortgageData.loan.rate || '0'),
            payment: parseFloat(lead.mortgageData.loan.payment || '0'),
            term: parseInt(lead.mortgageData.loan.term || '30'),
            type: lead.mortgageData.loan.type || 'Conventional'
          }
        } : {})
      }
    }));
  };

  const savePitchDeck = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-pitch-deck', {
        body: {
          action: id ? 'update' : 'create',
          pitchDeckId: id,
          pitchDeckData: {
            title: pitchDeck.title,
            description: pitchDeck.description,
            lead_id: selectedLead?.id || null,
            mortgage_data: pitchDeck.mortgage_data,
            template_type: pitchDeck.template_type
          }
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.success) {
        toast.success(`Pitch deck ${id ? 'updated' : 'created'} successfully`);
        if (!id && data.data) {
          navigate(`/pitch-deck/builder/${data.data.id}`);
        }
      }
    } catch (error) {
      console.error("Error saving pitch deck:", error);
      toast.error(`Failed to ${id ? 'update' : 'create'} pitch deck`);
    } finally {
      setSaving(false);
    }
  };

  const deletePitchDeck = async () => {
    if (!id) return;
    
    if (!confirm("Are you sure you want to delete this pitch deck?")) {
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('create-pitch-deck', {
        body: { action: 'delete', pitchDeckId: id }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.success) {
        toast.success("Pitch deck deleted successfully");
        navigate("/pitch-deck");
      }
    } catch (error) {
      console.error("Error deleting pitch deck:", error);
      toast.error("Failed to delete pitch deck");
    }
  };

  const calculateMonthlyPayment = (principal: number, rate: number, years: number) => {
    const monthlyRate = rate / 100 / 12;
    const numPayments = years * 12;
    
    if (monthlyRate === 0) return principal / numPayments;
    
    const monthlyPayment = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return monthlyPayment;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="sm"
                className="mr-4"
                onClick={() => navigate('/pitch-deck')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl font-bold">
                {id ? 'Edit Pitch Deck' : 'Create Pitch Deck'}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/pitch-deck/preview/${id}`)}
                disabled={!id}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {}}
                disabled
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={savePitchDeck}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
              {id && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={deletePitchDeck}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar - Client info */}
          <div>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Client Information</h2>
                  <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="h-8 px-2 bg-blue-500 hover:bg-blue-600">
                        <Search className="h-4 w-4 mr-1" /> Search Lead
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Search for a Lead</DialogTitle>
                      </DialogHeader>
                      <div className="flex items-center space-x-2 mt-4">
                        <Input
                          placeholder="Search by name or email"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyUp={(e) => e.key === 'Enter' && searchLeads()}
                        />
                        <Button onClick={searchLeads} disabled={searching}>
                          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                        </Button>
                      </div>
                      <div className="mt-4">
                        {searchResults.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {searchResults.map((lead) => (
                                <TableRow key={lead.id}>
                                  <TableCell>{lead.firstName} {lead.lastName}</TableCell>
                                  <TableCell>{lead.email}</TableCell>
                                  <TableCell>
                                    <Button 
                                      size="sm" 
                                      className="h-7 px-2"
                                      onClick={() => selectLead(lead)}
                                    >
                                      <UserPlus className="h-3 w-3 mr-1" /> Select
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : searching ? (
                          <div className="text-center py-4">Searching...</div>
                        ) : searchQuery ? (
                          <div className="text-center py-4">No leads found</div>
                        ) : (
                          <div className="text-center py-4">Search for leads by name or email</div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {selectedLead ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{selectedLead.firstName} {selectedLead.lastName}</h3>
                        <p className="text-sm text-gray-500">{selectedLead.email}</p>
                        <p className="text-sm text-gray-500">{selectedLead.phone}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0" 
                        onClick={() => setSelectedLead(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Property Address</label>
                      <p className="text-sm">{selectedLead.propertyAddress || 'No address available'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <UserPlus className="h-10 w-10 mx-auto text-gray-400" />
                    <p className="text-gray-500">No client selected</p>
                    <p className="text-sm text-gray-400">Search for a lead to import their information</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-4">Pitch Deck Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Title</label>
                    <Input 
                      value={pitchDeck.title} 
                      onChange={(e) => setPitchDeck({...pitchDeck, title: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <Textarea 
                      value={pitchDeck.description} 
                      onChange={(e) => setPitchDeck({...pitchDeck, description: e.target.value})}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-4">
                <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="info">Loan Information</TabsTrigger>
                    <TabsTrigger value="comparison">Comparison</TabsTrigger>
                    <TabsTrigger value="benefits">Benefits</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Current Loan */}
                      <div className="space-y-4 border rounded-lg p-4">
                        <h3 className="font-semibold text-lg flex items-center">
                          <Home className="h-4 w-4 mr-2 text-gray-500" /> Current Loan
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Loan Balance ($)</label>
                            <Input 
                              type="number"
                              value={pitchDeck.mortgage_data.currentLoan?.balance || 0} 
                              onChange={(e) => setPitchDeck({
                                ...pitchDeck,
                                mortgage_data: {
                                  ...pitchDeck.mortgage_data,
                                  currentLoan: {
                                    ...pitchDeck.mortgage_data.currentLoan,
                                    balance: parseFloat(e.target.value) || 0
                                  }
                                }
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Interest Rate (%)</label>
                            <Input 
                              type="number"
                              step="0.125"
                              value={pitchDeck.mortgage_data.currentLoan?.rate || 0} 
                              onChange={(e) => setPitchDeck({
                                ...pitchDeck,
                                mortgage_data: {
                                  ...pitchDeck.mortgage_data,
                                  currentLoan: {
                                    ...pitchDeck.mortgage_data.currentLoan,
                                    rate: parseFloat(e.target.value) || 0
                                  }
                                }
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Term (Years)</label>
                            <Input 
                              type="number"
                              value={pitchDeck.mortgage_data.currentLoan?.term || 30} 
                              onChange={(e) => setPitchDeck({
                                ...pitchDeck,
                                mortgage_data: {
                                  ...pitchDeck.mortgage_data,
                                  currentLoan: {
                                    ...pitchDeck.mortgage_data.currentLoan,
                                    term: parseInt(e.target.value) || 30
                                  }
                                }
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Loan Type</label>
                            <Input 
                              value={pitchDeck.mortgage_data.currentLoan?.type || "Conventional"} 
                              onChange={(e) => setPitchDeck({
                                ...pitchDeck,
                                mortgage_data: {
                                  ...pitchDeck.mortgage_data,
                                  currentLoan: {
                                    ...pitchDeck.mortgage_data.currentLoan,
                                    type: e.target.value
                                  }
                                }
                              })}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Proposed Loan */}
                      <div className="space-y-4 border rounded-lg p-4">
                        <h3 className="font-semibold text-lg flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-green-500" /> Proposed Loan
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Loan Amount ($)</label>
                            <Input 
                              type="number"
                              value={pitchDeck.mortgage_data.proposedLoan?.amount || 0} 
                              onChange={(e) => setPitchDeck({
                                ...pitchDeck,
                                mortgage_data: {
                                  ...pitchDeck.mortgage_data,
                                  proposedLoan: {
                                    ...pitchDeck.mortgage_data.proposedLoan,
                                    amount: parseFloat(e.target.value) || 0
                                  }
                                }
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Interest Rate (%)</label>
                            <Input 
                              type="number"
                              step="0.125"
                              value={pitchDeck.mortgage_data.proposedLoan?.rate || 0} 
                              onChange={(e) => setPitchDeck({
                                ...pitchDeck,
                                mortgage_data: {
                                  ...pitchDeck.mortgage_data,
                                  proposedLoan: {
                                    ...pitchDeck.mortgage_data.proposedLoan,
                                    rate: parseFloat(e.target.value) || 0
                                  }
                                }
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Term (Years)</label>
                            <Input 
                              type="number"
                              value={pitchDeck.mortgage_data.proposedLoan?.term || 30} 
                              onChange={(e) => setPitchDeck({
                                ...pitchDeck,
                                mortgage_data: {
                                  ...pitchDeck.mortgage_data,
                                  proposedLoan: {
                                    ...pitchDeck.mortgage_data.proposedLoan,
                                    term: parseInt(e.target.value) || 30
                                  }
                                }
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Loan Type</label>
                            <Input 
                              value={pitchDeck.mortgage_data.proposedLoan?.type || "Conventional"} 
                              onChange={(e) => setPitchDeck({
                                ...pitchDeck,
                                mortgage_data: {
                                  ...pitchDeck.mortgage_data,
                                  proposedLoan: {
                                    ...pitchDeck.mortgage_data.proposedLoan,
                                    type: e.target.value
                                  }
                                }
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="comparison">
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-gray-50">
                          <CardContent className="p-4 text-center">
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Current Payment</h3>
                            <p className="text-xl font-bold text-gray-800">
                              {formatCurrency(pitchDeck.mortgage_data.currentLoan?.payment || 0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">per month</p>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-green-50">
                          <CardContent className="p-4 text-center">
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Proposed Payment</h3>
                            <p className="text-xl font-bold text-green-800">
                              {formatCurrency(pitchDeck.mortgage_data.proposedLoan?.payment || 0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">per month</p>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-blue-50">
                          <CardContent className="p-4 text-center">
                            <h3 className="text-sm font-medium text-gray-700 mb-1">Monthly Savings</h3>
                            <p className="text-xl font-bold text-blue-800">
                              {formatCurrency((pitchDeck.mortgage_data.savings?.monthly || 0) > 0 ? 
                                (pitchDeck.mortgage_data.savings?.monthly || 0) : 0)}
                            </p>
                            <div className="flex items-center justify-center">
                              {(pitchDeck.mortgage_data.savings?.monthly || 0) > 0 ? (
                                <span className="text-xs text-green-600 flex items-center">
                                  <Check className="h-3 w-3 mr-1" /> Lower payment
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">No savings</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-semibold mb-4">Loan Comparison</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-2 text-left">Feature</th>
                                <th className="p-2 text-right">Current Loan</th>
                                <th className="p-2 text-right">Proposed Loan</th>
                                <th className="p-2 text-right">Difference</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b">
                                <td className="p-2">Principal</td>
                                <td className="p-2 text-right">
                                  {formatCurrency(pitchDeck.mortgage_data.currentLoan?.balance || 0)}
                                </td>
                                <td className="p-2 text-right">
                                  {formatCurrency(pitchDeck.mortgage_data.proposedLoan?.amount || 0)}
                                </td>
                                <td className="p-2 text-right">
                                  {formatCurrency((pitchDeck.mortgage_data.proposedLoan?.amount || 0) - 
                                    (pitchDeck.mortgage_data.currentLoan?.balance || 0))}
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="p-2">Interest Rate</td>
                                <td className="p-2 text-right">
                                  {(pitchDeck.mortgage_data.currentLoan?.rate || 0).toFixed(3)}%
                                </td>
                                <td className="p-2 text-right">
                                  {(pitchDeck.mortgage_data.proposedLoan?.rate || 0).toFixed(3)}%
                                </td>
                                <td className="p-2 text-right">
                                  {((pitchDeck.mortgage_data.proposedLoan?.rate || 0) - 
                                    (pitchDeck.mortgage_data.currentLoan?.rate || 0)).toFixed(3)}%
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="p-2">Term</td>
                                <td className="p-2 text-right">
                                  {pitchDeck.mortgage_data.currentLoan?.term} years
                                </td>
                                <td className="p-2 text-right">
                                  {pitchDeck.mortgage_data.proposedLoan?.term} years
                                </td>
                                <td className="p-2 text-right">
                                  {(pitchDeck.mortgage_data.proposedLoan?.term || 0) - 
                                    (pitchDeck.mortgage_data.currentLoan?.term || 0)} years
                                </td>
                              </tr>
                              <tr className="border-b">
                                <td className="p-2">Monthly Payment</td>
                                <td className="p-2 text-right">
                                  {formatCurrency(pitchDeck.mortgage_data.currentLoan?.payment || 0)}
                                </td>
                                <td className="p-2 text-right">
                                  {formatCurrency(pitchDeck.mortgage_data.proposedLoan?.payment || 0)}
                                </td>
                                <td className="p-2 text-right">
                                  {formatCurrency((pitchDeck.mortgage_data.proposedLoan?.payment || 0) - 
                                    (pitchDeck.mortgage_data.currentLoan?.payment || 0))}
                                </td>
                              </tr>
                              <tr>
                                <td className="p-2">Total Interest</td>
                                <td className="p-2 text-right">
                                  {formatCurrency(
                                    ((pitchDeck.mortgage_data.currentLoan?.payment || 0) * 
                                      (pitchDeck.mortgage_data.currentLoan?.term || 30) * 12) -
                                    (pitchDeck.mortgage_data.currentLoan?.balance || 0)
                                  )}
                                </td>
                                <td className="p-2 text-right">
                                  {formatCurrency(
                                    ((pitchDeck.mortgage_data.proposedLoan?.payment || 0) * 
                                      (pitchDeck.mortgage_data.proposedLoan?.term || 30) * 12) -
                                    (pitchDeck.mortgage_data.proposedLoan?.amount || 0)
                                  )}
                                </td>
                                <td className="p-2 text-right">
                                  {formatCurrency(
                                    (((pitchDeck.mortgage_data.proposedLoan?.payment || 0) * 
                                      (pitchDeck.mortgage_data.proposedLoan?.term || 30) * 12) -
                                    (pitchDeck.mortgage_data.proposedLoan?.amount || 0)) -
                                    (((pitchDeck.mortgage_data.currentLoan?.payment || 0) * 
                                      (pitchDeck.mortgage_data.currentLoan?.term || 30) * 12) -
                                    (pitchDeck.mortgage_data.currentLoan?.balance || 0))
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="benefits">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-green-50">
                          <CardContent className="p-6 text-center">
                            <Calculator className="h-10 w-10 mx-auto text-green-600 mb-3" />
                            <h3 className="text-lg font-medium">Lifetime Savings</h3>
                            <p className="text-2xl font-bold text-green-700 mt-2">
                              {formatCurrency(pitchDeck.mortgage_data.savings?.lifetime || 0)}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              Over {pitchDeck.mortgage_data.proposedLoan?.term} years
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-6">
                            <h3 className="font-medium mb-3">Key Benefits</h3>
                            <ul className="space-y-2">
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                                <span>Lower monthly mortgage payment</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                                <span>Reduced interest over loan term</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                                <span>Improved cash flow for other expenses</span>
                              </li>
                              <li className="flex items-start">
                                <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                                <span>Simplified payment schedule</span>
                              </li>
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <Card>
                        <CardContent className="p-4">
                          <h3 className="font-medium mb-3">Additional Notes</h3>
                          <Textarea 
                            placeholder="Add any additional benefits or notes specific to this client's situation..."
                            rows={4}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PitchDeckBuilder;
