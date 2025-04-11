
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Send, Copy, Check, Loader2 } from 'lucide-react';

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface LoanOfficerInfo {
  name: string;
  nmls_id: string;
  company: string;
  phone: string;
  email: string;
}

interface MortgageData {
  propertyValue?: number;
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
}

interface SendPitchDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitchDeck: {
    id: string;
    title: string;
    description?: string;
    client_info?: ClientInfo;
    loan_officer_info?: LoanOfficerInfo;
    mortgage_data?: MortgageData;
  } | null;
}

const SendPitchDeckModal: React.FC<SendPitchDeckModalProps> = ({ isOpen, onClose, pitchDeck }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCreatingLandingPage, setIsCreatingLandingPage] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [landingPageUrl, setLandingPageUrl] = useState<string | null>(null);
  const [propertyValue, setPropertyValue] = useState<string>('');
  
  React.useEffect(() => {
    if (isOpen) {
      // Use client name in the subject if available
      const clientName = pitchDeck?.client_info?.name || 'Client';
      setSubject(pitchDeck?.title ? `Mortgage Proposal for ${clientName}: ${pitchDeck.title}` : '');
      
      // Create personalized message with client and loan officer info
      const officerName = pitchDeck?.loan_officer_info?.name || 'Your Mortgage Professional';
      const officerCompany = pitchDeck?.loan_officer_info?.company || '';
      const officerSignature = officerCompany ? `${officerName}\n${officerCompany}` : officerName;
      
      const clientGreeting = pitchDeck?.client_info?.name ? `Dear ${pitchDeck.client_info.name},` : 'Dear Client,';
      
      setMessage(
        `${clientGreeting}\n\nI'm excited to share this mortgage proposal with you.${
          pitchDeck?.description ? `\n\n${pitchDeck.description}` : ''
        }\n\nPlease review the attached document and let me know if you have any questions.\n\nBest regards,\n${officerSignature}`
      );
      
      // Pre-populate recipient email if available
      if (pitchDeck?.client_info?.email) {
        setRecipientEmail(pitchDeck.client_info.email);
      } else {
        setRecipientEmail('');
      }
      
      // Set property value from pitch deck or default
      if (pitchDeck?.mortgage_data?.propertyValue) {
        setPropertyValue(pitchDeck.mortgage_data.propertyValue.toString());
      } else {
        // Try to estimate from mortgage data if available
        const currentLoan = pitchDeck?.mortgage_data?.currentLoan;
        if (currentLoan?.balance) {
          // Default estimate: loan balance × 1.25 (assuming 80% LTV)
          setPropertyValue((currentLoan.balance * 1.25).toString());
        } else {
          setPropertyValue('');
        }
      }
      
      setIsSending(false);
      setIsCreatingLandingPage(false);
      setLandingPageUrl(null);
      setIsCopied(false);
    }
  }, [isOpen, pitchDeck]);

  const handleSendEmail = async () => {
    if (!pitchDeck?.id) {
      toast.error('No pitch deck selected');
      return;
    }

    if (!recipientEmail) {
      toast.error('Please enter a recipient email address');
      return;
    }

    setIsSending(true);
    setIsCreatingLandingPage(true);

    try {
      // Update pitch deck with property value if provided
      if (propertyValue && !isNaN(Number(propertyValue))) {
        const propertyValueNumber = Number(propertyValue);
        
        await supabase
          .from('pitch_decks')
          .update({
            mortgage_data: {
              ...pitchDeck.mortgage_data,
              propertyValue: propertyValueNumber
            }
          })
          .eq('id', pitchDeck.id);
      }

      toast.info('Creating landing page and generating PDF...');
      
      const { data, error } = await supabase.functions.invoke('send-pitch-deck', {
        body: {
          pitchDeckId: pitchDeck.id,
          recipientEmail,
          subject: subject || `Mortgage Proposal: ${pitchDeck.title}`,
          message: message || 'Please review the attached mortgage proposal.',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast.success(`Pitch deck sent to ${recipientEmail}`);
        
        if (data.landingPageUrl) {
          setLandingPageUrl(data.landingPageUrl);
        } else {
          const isPreview = window.location.hostname.includes('preview--');
          let shareUrl;
          
          if (isPreview) {
            shareUrl = `https://preview--aicrmworking.lovable.app/your-home-solution/${pitchDeck.id}`;
          } else {
            shareUrl = `${window.location.origin}/your-home-solution/${pitchDeck.id}`;
          }
          
          setLandingPageUrl(shareUrl);
        }
      } else {
        throw new Error(data.message || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending pitch deck:', error);
      toast.error(`Failed to send email: ${error.message}`);
    } finally {
      setIsSending(false);
      setIsCreatingLandingPage(false);
    }
  };

  const handleCopyLink = () => {
    if (!landingPageUrl) return;
    
    navigator.clipboard.writeText(landingPageUrl)
      .then(() => {
        setIsCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setIsCopied(false), 3000);
      })
      .catch((err) => {
        console.error('Failed to copy link:', err);
        toast.error('Failed to copy link to clipboard');
      });
  };

  const formatCurrency = (value: string): string => {
    // Remove non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Convert to number and format
    const num = parseInt(digitsOnly, 10);
    if (isNaN(num)) return '';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num).replace('$', '');
  };

  const handlePropertyValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setPropertyValue(formatted);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Pitch Deck</DialogTitle>
          <DialogDescription>
            Send this mortgage proposal to your client via email.
          </DialogDescription>
        </DialogHeader>
        
        {isCreatingLandingPage ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-sm text-gray-600">
              Creating landing page and preparing your email...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              This may take a moment
            </p>
          </div>
        ) : landingPageUrl ? (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-md">
              <h4 className="font-medium mb-1 text-green-700">Email sent successfully!</h4>
              <p className="text-sm text-green-600 mb-3">
                Your mortgage proposal has been sent to {recipientEmail}.
              </p>
              
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Shareable Link</label>
                <div className="flex">
                  <Input 
                    value={landingPageUrl} 
                    readOnly 
                    className="flex-1 rounded-r-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-l-none"
                    onClick={handleCopyLink}
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
                <p className="text-xs mt-1 text-gray-500">
                  Share this link with your client to view the proposal online
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="propertyValue" className="block text-sm font-medium mb-1">Property Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="propertyValue"
                  type="text"
                  value={propertyValue}
                  onChange={handlePropertyValueChange}
                  placeholder="500,000"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This helps create accurate property equity visualizations
              </p>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Recipient Email</label>
              <Input
                id="email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-sm font-medium mb-1">Subject</label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Mortgage Proposal"
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message to the client..."
                rows={5}
              />
            </div>
            
            <DialogFooter className="flex items-center justify-end space-x-2">
              <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSending || !recipientEmail}
                className="gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendPitchDeckModal;
