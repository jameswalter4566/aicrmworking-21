
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateClientPortal } from '@/utils/clientPortalUtils';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ClientPortalGeneratorProps {
  leadId: number;
  onLinkGenerated: (url: string) => void;
  createdBy?: string;
}

const ClientPortalGenerator = ({ leadId, onLinkGenerated, createdBy }: ClientPortalGeneratorProps) => {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePortal = async () => {
    setGenerating(true);
    try {
      const { url, error } = await generateClientPortal(leadId, createdBy);
      
      if (error) {
        console.error('Error generating portal:', error);
        throw new Error(error);
      }

      onLinkGenerated(url);
      toast.success('Portal link generated successfully');
    } catch (error) {
      console.error('Error generating portal:', error);
      toast.error('Failed to generate portal link', {
        description: error instanceof Error ? error.message : 'Try again later'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button 
      onClick={handleGeneratePortal} 
      disabled={generating}
      className="w-full"
    >
      {generating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Portal Link...
        </>
      ) : (
        'Generate Portal Link'
      )}
    </Button>
  );
};

export default ClientPortalGenerator;
