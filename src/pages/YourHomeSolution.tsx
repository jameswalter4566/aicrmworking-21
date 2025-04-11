
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, ArrowRight, Info } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const YourHomeSolution = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [pitchDeck, setPitchDeck] = useState<any>(null);
  
  useEffect(() => {
    const fetchPitchDeck = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.functions.invoke('retrieve-pitch-deck', {
          body: { pitchDeckId: id }
        });
        
        if (error) throw new Error(error.message);
        
        if (data?.success && data?.data) {
          console.log('Fetched pitch deck:', data.data);
          setPitchDeck(data.data);
        } else {
          throw new Error('Failed to load pitch deck data');
        }
      } catch (error: any) {
        console.error('Error fetching pitch deck:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPitchDeck();
  }, [id]);
  
  const handleDownloadPDF = async () => {
    if (!pitchDeck?.id) return;
    
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-pitch-deck', {
        body: {
          action: 'get-pdf',
          pitchDeckId: pitchDeck.id
        }
      });
      
      if (error) throw new Error(error.message);
      
      if (data?.pdfData) {
        const link = document.createElement('a');
        link.href = data.pdfData;
        link.download = `${pitchDeck.title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setDownloading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!pitchDeck) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <Info className="h-12 w-12 text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Proposal Not Found</h1>
        <p className="text-gray-600 max-w-md">
          The mortgage proposal you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }
  
  // Get mortgage data
  const mortgageData = pitchDeck.mortgage_data || {};
  const currentLoan = mortgageData.currentLoan || {};
  const proposedLoan = mortgageData.proposedLoan || {};
  const savings = mortgageData.savings || {};
  const propertyValue = mortgageData.propertyValue;
  const clientName = mortgageData.clientName || 'Client';
  const clientAddress = mortgageData.clientAddress;
  const loanOfficer = mortgageData.loanOfficer || {};
  
  // Calculate equity
  let currentEquity = 0;
  let currentEquityPercent = 0;
  
  if (propertyValue && currentLoan.balance) {
    currentEquity = propertyValue - currentLoan.balance;
    currentEquityPercent = Math.round((currentEquity / propertyValue) * 100);
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{pitchDeck.title}</h1>
          {clientName && clientName !== 'Client' && (
            <h2 className="text-xl text-gray-700">Prepared for: {clientName}</h2>
          )}
          {clientAddress && (
            <p className="text-gray-600 mt-1">{clientAddress}</p>
          )}
          {loanOfficer?.name && (
            <div className="mt-4 text-sm text-gray-500">
              <p>Prepared by: {loanOfficer.name} {loanOfficer.nmlsId && `(NMLS ID: ${loanOfficer.nmlsId})`}</p>
              {loanOfficer.companyName && <p>{loanOfficer.companyName}</p>}
            </div>
          )}
          {pitchDeck.description && (
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">{pitchDeck.description}</p>
          )}
        </header>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {propertyValue > 0 && (
            <Card className="bg-white shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Property Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${propertyValue.toLocaleString()}</div>
              </CardContent>
            </Card>
          )}
          
          {currentEquity > 0 && (
            <Card className="bg-white shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Current Equity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${currentEquity.toLocaleString()}</div>
                <p className="text-sm text-gray-500">{currentEquityPercent}% of property value</p>
              </CardContent>
            </Card>
          )}
          
          {savings?.monthly > 0 && (
            <Card className="bg-white shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Monthly Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${savings.monthly.toLocaleString()}</div>
                <p className="text-sm text-gray-500">per month</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Current Loan */}
          <Card className="bg-white shadow border-t-4 border-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Loan</CardTitle>
                <Badge variant="outline" className="bg-blue-50">Existing</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentLoan.balance && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Balance</span>
                  <span className="font-medium">${currentLoan.balance.toLocaleString()}</span>
                </div>
              )}
              {currentLoan.rate && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Interest Rate</span>
                  <span className="font-medium">{currentLoan.rate.toFixed(3)}%</span>
                </div>
              )}
              {currentLoan.payment && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Monthly Payment</span>
                  <span className="font-medium">${currentLoan.payment.toLocaleString()}</span>
                </div>
              )}
              {currentLoan.term && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Loan Term</span>
                  <span className="font-medium">{currentLoan.term} years</span>
                </div>
              )}
              {currentLoan.type && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Loan Type</span>
                  <span className="font-medium">{currentLoan.type}</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Proposed Loan */}
          <Card className="bg-white shadow border-t-4 border-green-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Proposed Loan</CardTitle>
                <Badge variant="outline" className="bg-green-50">Recommended</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposedLoan.amount && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-medium">${proposedLoan.amount.toLocaleString()}</span>
                </div>
              )}
              {proposedLoan.rate && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Interest Rate</span>
                  <span className="font-medium text-green-600">{proposedLoan.rate.toFixed(3)}%</span>
                </div>
              )}
              {proposedLoan.payment && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Monthly Payment</span>
                  <span className="font-medium text-green-600">${proposedLoan.payment.toLocaleString()}</span>
                </div>
              )}
              {proposedLoan.term && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Loan Term</span>
                  <span className="font-medium">{proposedLoan.term} years</span>
                </div>
              )}
              {proposedLoan.type && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Loan Type</span>
                  <span className="font-medium">{proposedLoan.type}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Savings Summary */}
        {savings?.lifetime > 0 && (
          <Card className="bg-white shadow mb-8 border-l-4 border-green-500">
            <CardHeader>
              <CardTitle>Lifetime Savings</CardTitle>
              <CardDescription>
                By refinancing, you could save:
              </CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-green-600">
              ${savings.lifetime.toLocaleString()}
            </CardContent>
            <CardFooter className="text-sm text-gray-600">
              Based on a full term of {proposedLoan.term || 30} years
            </CardFooter>
          </Card>
        )}
        
        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="mr-4"
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Proposal
              </>
            )}
          </Button>
          
          {loanOfficer?.name && (
            <div className="mt-8 p-4 bg-gray-100 rounded-lg inline-block text-center">
              <p className="text-gray-800 font-medium">Have questions? Contact your loan officer:</p>
              <p className="text-gray-700 mt-1">{loanOfficer.name}</p>
              {loanOfficer.nmlsId && <p className="text-sm text-gray-600">NMLS ID: {loanOfficer.nmlsId}</p>}
              {loanOfficer.companyName && <p className="text-sm text-gray-600">{loanOfficer.companyName}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YourHomeSolution;
