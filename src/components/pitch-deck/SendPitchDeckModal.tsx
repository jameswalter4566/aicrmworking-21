
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Info } from "lucide-react";
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
  const [stepStatus, setStepStatus] = useState<{
    checkingEmail: boolean;
    generatingPdf: boolean;
    sendingEmail: boolean;
  }>({
    checkingEmail: false,
    generatingPdf: false,
    sendingEmail: false
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen && pitchDeck) {
      setSubject(`Mortgage Proposal: ${pitchDeck.title}`);
      setMessage(
        `Dear Client,\n\nI'm excited to share this mortgage proposal with you.\n\n${
          pitchDeck.description || ""
        }\n\nPlease review the attached document and let me know if you have any questions.\n\nBest regards,\n[Your Name]`
      );
      setError(null);
      setStepStatus({
        checkingEmail: false,
        generatingPdf: false,
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
      // Step 1: Check if email is connected
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

      // Step 2: Generate PDF and send email
      setStepStatus({ ...stepStatus, checkingEmail: false, generatingPdf: true });
      toast.info("Generating PDF and preparing email...");

      console.log("Sending pitch deck:", { 
        pitchDeckId: pitchDeck.id, 
        recipientEmail, 
        subject 
      });

      // Get the auth token
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error("You must be logged in to send pitch decks");
      }

      // Step 3: Send the email
      setStepStatus({ ...stepStatus, generatingPdf: false, sendingEmail: true });
      
      // Send the pitch deck with the session token
      const { data, error } = await supabase.functions.invoke("send-pitch-deck", {
        body: {
          pitchDeckId: pitchDeck.id,
          recipientEmail,
          subject,
          message,
          // Pass auth token explicitly to ensure it's available in the function
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
        
        // Check for Gmail permission errors
        if (errorMessage.toLowerCase().includes("permissions") || 
            errorMessage.toLowerCase().includes("reconnect") || 
            errorMessage.toLowerCase().includes("gmail")) {
          setError("Your Gmail account needs additional permissions to send emails with attachments. Please go to Settings and reconnect your Gmail account with full access.");
          return;
        }
        
        throw new Error(errorMessage);
      }

      toast.success(`Pitch deck sent to ${recipientEmail}`);
      onClose();
      setRecipientEmail("");
      setSubject("");
      setMessage("");
    } catch (error: any) {
      console.error("Error sending pitch deck:", error);
      
      // Set specific error message
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
        generatingPdf: false,
        sendingEmail: false
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Pitch Deck to Client</DialogTitle>
          <DialogDescription>
            Send your pitch deck as a PDF attachment to your client's email.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2">
              <span>{error}</span>
              {error.toLowerCase().includes("gmail") && (
                <span className="text-xs mt-1">
                  This is typically because Gmail requires additional permissions for sending attachments.
                  Please go to Settings and reconnect your Gmail account.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

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
                <div className={`w-4 h-4 mr-2 ${stepStatus.generatingPdf ? 'text-blue-500' : stepStatus.checkingEmail ? 'text-gray-400' : 'text-gray-400'}`}>
                  {stepStatus.generatingPdf ? <Loader2 className="animate-spin" size={16} /> : stepStatus.checkingEmail ? '-' : '✓'}
                </div>
                <span>Generating PDF document...</span>
              </div>
              <div className="flex items-center">
                <div className={`w-4 h-4 mr-2 ${stepStatus.sendingEmail ? 'text-blue-500' : stepStatus.generatingPdf || stepStatus.checkingEmail ? 'text-gray-400' : 'text-gray-400'}`}>
                  {stepStatus.sendingEmail ? <Loader2 className="animate-spin" size={16} /> : stepStatus.generatingPdf || stepStatus.checkingEmail ? '-' : '✓'}
                </div>
                <span>Sending email...</span>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendPitchDeckModal;
