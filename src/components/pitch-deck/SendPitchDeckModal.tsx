import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Info, Copy, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";

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
  const { getAuthToken } = useAuth();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [landingPageUrl, setLandingPageUrl] = useState<string | null>(null);
  const [stepStatus, setStepStatus] = useState<{
    checkingEmail: boolean;
    creatingPage: boolean;
    sendingEmail: boolean;
  }>({
    checkingEmail: false,
    creatingPage: false,
    sendingEmail: false
  });

  React.useEffect(() => {
    if (isOpen && pitchDeck) {
      setSubject(`Mortgage Proposal: ${pitchDeck.title}`);
      setMessage(
        `Dear Client,\n\nI'm excited to share this mortgage proposal with you.\n\n${
          pitchDeck.description || ""
        }\n\nPlease review your personalized mortgage proposal at the link provided.\n\nBest regards,\n[Your Name]`
      );
      setError(null);
      setLandingPageUrl(null);
      setStepStatus({
        checkingEmail: false,
        creatingPage: false,
        sendingEmail: false
      });
    }
  }, [isOpen, pitchDeck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pitchDeck) return;

    setLoading(true);
    setError(null);
    
    try {
      setStepStatus({ ...stepStatus, checkingEmail: true });
      const { data: connections, error: connectionsError } = await supabase
        .from("user_email_connections")
        .select("*")
        .eq("provider", "google")
        .limit(1);

      if (connectionsError) {
        console.error("Error checking email connections:", connectionsError);
        throw new Error("Failed to check email connection status");
      }

      if (!connections || connections.length === 0) {
        toast.error("No email connection found. Please connect your Gmail account in the Settings page.");
        onClose();
        return;
      }

      setStepStatus({ ...stepStatus, checkingEmail: false, creatingPage: true });
      toast.info("Creating personalized landing page and preparing email...");

      console.log("Sending pitch deck:", { 
        pitchDeckId: pitchDeck.id, 
        recipientEmail, 
        subject 
      });

      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error("You must be logged in to send pitch decks");
      }

      setStepStatus({ ...stepStatus, creatingPage: false, sendingEmail: true });
      
      const { data, error } = await supabase.functions.invoke("send-pitch-deck", {
        body: {
          pitchDeckId: pitchDeck.id,
          recipientEmail,
          subject,
          message,
          token: authToken
        },
      });

      if (error) {
        console.error("Error response from send-pitch-deck:", error);
        throw new Error(`Function error: ${error.message}`);
      }

      if (!data || data.success === false) {
        console.error("Error in response data:", data);
        const errorMessage = data?.error || "Unknown error occurred";
        
        if (errorMessage.toLowerCase().includes("permissions") || 
            errorMessage.toLowerCase().includes("reconnect") || 
            errorMessage.toLowerCase().includes("gmail")) {
          setError("Your Gmail account needs additional permissions to send emails. Please go to Settings and reconnect your Gmail account with full access.");
          return;
        }
        
        throw new Error(errorMessage);
      }

      if (data.landingPageUrl) {
        setLandingPageUrl(data.landingPageUrl);
      }

      toast.success(`Pitch deck sent to ${recipientEmail}`);
    } catch (error: any) {
      console.error("Error sending pitch deck:", error);
      
      if (error.message.toLowerCase().includes("permissions") || 
          error.message.toLowerCase().includes("reconnect") || 
          error.message.toLowerCase().includes("gmail")) {
        setError("Your Gmail connection needs additional permissions. Please go to the Settings page and reconnect your Gmail account with full access permission.");
        toast.error("Email permissions issue detected");
      } else {
        setError(error.message);
        toast.error(`Failed to send: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setStepStatus({
        checkingEmail: false,
        creatingPage: false,
        sendingEmail: false
      });
    }
  };

  const handleCopyLink = () => {
    if (landingPageUrl) {
      navigator.clipboard.writeText(landingPageUrl);
      toast.success("Landing page link copied to clipboard");
    }
  };

  const handleCloseWithReset = () => {
    setLandingPageUrl(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseWithReset()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Proposal to Client</DialogTitle>
          <DialogDescription>
            Send your mortgage proposal as a personalized landing page to your client's email.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2">
              <span>{error}</span>
              {error.toLowerCase().includes("gmail") && (
                <span className="text-xs mt-1">
                  This is typically because Gmail requires additional permissions for sending emails.
                  Please go to Settings and reconnect your Gmail account.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {landingPageUrl ? (
          <div className="space-y-4 py-4">
            <Alert variant="default" className="bg-green-50 border-green-200">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your proposal has been successfully sent to {recipientEmail}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label>Landing Page URL</Label>
              <div className="flex gap-2">
                <Input
                  value={landingPageUrl}
                  readOnly
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleCopyLink}
                  title="Copy link to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => window.open(landingPageUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                View Landing Page
              </Button>
              <Button onClick={handleCloseWithReset}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email</Label>
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Mortgage Proposal"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                disabled={loading}
              />
            </div>

            {loading && (
              <div className="text-sm text-gray-500 flex flex-col gap-1">
                <div className="flex items-center">
                  <div className={`w-4 h-4 mr-2 ${stepStatus.checkingEmail ? 'text-blue-500' : 'text-gray-400'}`}>
                    {stepStatus.checkingEmail ? <Loader2 className="animate-spin" size={16} /> : '✓'}
                  </div>
                  <span>Verifying email connection...</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 mr-2 ${stepStatus.creatingPage ? 'text-blue-500' : stepStatus.checkingEmail ? 'text-gray-400' : 'text-gray-400'}`}>
                    {stepStatus.creatingPage ? <Loader2 className="animate-spin" size={16} /> : stepStatus.checkingEmail ? '-' : '✓'}
                  </div>
                  <span>Creating personalized landing page...</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 mr-2 ${stepStatus.sendingEmail ? 'text-blue-500' : stepStatus.creatingPage || stepStatus.checkingEmail ? 'text-gray-400' : 'text-gray-400'}`}>
                    {stepStatus.sendingEmail ? <Loader2 className="animate-spin" size={16} /> : stepStatus.creatingPage || stepStatus.checkingEmail ? '-' : '✓'}
                  </div>
                  <span>Sending email...</span>
                </div>
              </div>
            )}

            <DialogFooter className="sm:justify-end">
              <Button type="button" variant="outline" onClick={handleCloseWithReset} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Email
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendPitchDeckModal;
