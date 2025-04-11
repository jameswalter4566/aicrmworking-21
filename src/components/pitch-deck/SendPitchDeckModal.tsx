import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Send, Copy, Check, Loader2 } from 'lucide-react';

interface SendPitchDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitchDeck: {
    id: string;
    title: string;
    description?: string;
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
  
  React.useEffect(() => {
    if (isOpen) {
      setSubject(pitchDeck?.title ? `Mortgage Proposal: ${pitchDeck.title}` : '');
      setMessage(
        `Dear Client,\n\nI'm excited to share this mortgage proposal with you.${
          pitchDeck?.description ? `\n\n${pitchDeck.description}` : ''
        }\n\nPlease review the attached document and let me know if you have any questions.\n\nBest regards,\nYour Mortgage Professional`
      );
      setRecipientEmail('');
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
