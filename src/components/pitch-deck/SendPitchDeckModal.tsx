
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen && pitchDeck) {
      setSubject(`Mortgage Proposal: ${pitchDeck.title}`);
      setMessage(
        `Dear Client,\n\nI'm excited to share this mortgage proposal with you.\n\n${
          pitchDeck.description || ""
        }\n\nPlease review the attached document and let me know if you have any questions.\n\nBest regards,\n[Your Name]`
      );
    }
  }, [isOpen, pitchDeck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pitchDeck) return;

    setLoading(true);
    try {
      // Check if email is connected before sending
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

      console.log("Sending pitch deck:", { 
        pitchDeckId: pitchDeck.id, 
        recipientEmail, 
        subject 
      });

      // Send the pitch deck
      const { data, error } = await supabase.functions.invoke("send-pitch-deck", {
        body: {
          pitchDeckId: pitchDeck.id,
          recipientEmail,
          subject,
          message,
        },
      });

      if (error) {
        console.error("Error response from send-pitch-deck:", error);
        throw new Error(`Function error: ${error.message}`);
      }

      if (!data || data.success === false) {
        console.error("Error in response data:", data);
        throw new Error(data?.error || "Unknown error occurred");
      }

      toast.success(`Pitch deck sent to ${recipientEmail}`);
      onClose();
    } catch (error: any) {
      console.error("Error sending pitch deck:", error);
      toast.error(`Failed to send: ${error.message}`);
    } finally {
      setLoading(false);
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mortgage Proposal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>

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
