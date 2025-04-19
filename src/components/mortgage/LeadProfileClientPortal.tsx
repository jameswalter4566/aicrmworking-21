
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientPortalGenerator from './ClientPortalGenerator';
import { toast } from 'sonner';

interface LeadProfileClientPortalProps {
  leadId: string | number;
}

const LeadProfileClientPortal: React.FC<LeadProfileClientPortalProps> = ({ leadId }) => {
  const handleLinkGenerated = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Portal link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link to clipboard");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Portal Access</CardTitle>
      </CardHeader>
      <CardContent>
        <ClientPortalGenerator 
          leadId={Number(leadId)}
          onLinkGenerated={handleLinkGenerated}
        />
      </CardContent>
    </Card>
  );
};

export default LeadProfileClientPortal;
