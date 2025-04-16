
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { generateClientPortal } from "@/utils/clientPortalUtils";
import { toast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, ExternalLink, Send } from "lucide-react";

interface ClientPortalGeneratorProps {
  leadId: number;
}

const ClientPortalGenerator: React.FC<ClientPortalGeneratorProps> = ({ leadId }) => {
  const [loading, setLoading] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateClientPortal(leadId);
      
      if (result.error || !result.portal) {
        toast({
          variant: "destructive",
          title: "Error generating portal",
          description: result.error || "An unknown error occurred",
        });
        return;
      }
      
      // Set the full URL (including domain)
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}${result.url}`;
      setPortalUrl(fullUrl);
      setShowDialog(true);
      
      toast({
        title: "Portal generated successfully",
        description: "You can now share this link with your client.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(portalUrl);
    toast({
      title: "Copied to clipboard",
      description: "The portal URL has been copied to your clipboard.",
    });
  };
  
  const sendEmail = async () => {
    if (!recipientEmail) {
      toast({
        variant: "destructive", 
        title: "Email required",
        description: "Please enter an email address to send the portal link.",
      });
      return;
    }
    
    // In a real app, implement sending the email via an API
    toast({
      title: "Email sent",
      description: `Portal link has been sent to ${recipientEmail}`,
    });
  };
  
  const visitPortal = () => {
    window.open(portalUrl, '_blank');
  };

  return (
    <>
      <Button 
        onClick={handleGenerate} 
        disabled={loading} 
        className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          'Generate Client Portal'
        )}
      </Button>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Client Portal Link</DialogTitle>
            <DialogDescription>
              Share this secure link with your client to access their mortgage portal.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 mt-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">
                Portal Link
              </Label>
              <Input
                id="link"
                defaultValue={portalUrl}
                readOnly
                className="font-mono"
              />
            </div>
            <Button type="button" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" onClick={visitPortal} className="bg-blue-500 hover:bg-blue-600">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-col space-y-2 mt-4">
            <Label htmlFor="email">Send via email</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <Button type="button" onClick={sendEmail}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientPortalGenerator;
