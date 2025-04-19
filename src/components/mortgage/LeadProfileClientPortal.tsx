
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import ClientPortalGenerator from './ClientPortalGenerator';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LeadProfileClientPortalProps {
  leadId: string | number;
  isMortgageLead?: boolean;
}

export const LeadProfileClientPortal = ({ leadId, isMortgageLead }: LeadProfileClientPortalProps) => {
  const { user } = useAuth();

  const handleLinkGenerated = (url: string) => {
    // Copy to clipboard
    navigator.clipboard.writeText(url);
    toast.success("Portal link copied to clipboard!", {
      description: "You can now share this link with your client."
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Portal Access</CardTitle>
        <CardDescription>
          Generate a secure portal link for your client to access their loan information
          {!isMortgageLead && " (Available after pushing to pipeline)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ClientPortalGenerator 
          leadId={Number(leadId)} 
          onLinkGenerated={handleLinkGenerated}
          createdBy={user?.id}
        />
      </CardContent>
    </Card>
  );
};
