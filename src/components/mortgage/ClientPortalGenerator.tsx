
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateClientPortal, PortalAccess } from '@/utils/clientPortalUtils';
import { Loader2 } from 'lucide-react';

interface ClientPortalGeneratorProps {
  leadId: number;
  onLinkGenerated?: (url: string) => void;
}

const ClientPortalGenerator = ({ leadId, onLinkGenerated }: ClientPortalGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [portalData, setPortalData] = useState<{url: string, portal: PortalAccess | null} | null>(null);
  
  const handleGeneratePortal = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    try {
      const result = await generateClientPortal(leadId);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      setPortalData(result);
      toast.success('Portal access generated successfully');
      
      // Notify parent component about the generated link
      if (onLinkGenerated) {
        onLinkGenerated(result.url);
      }
    } catch (error) {
      console.error('Error generating portal:', error);
      toast.error('Failed to generate portal access');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {portalData ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-800">
          <p className="text-sm font-medium">Portal access generated successfully!</p>
          <p className="text-xs mt-1">You can now copy the link and share it with the borrower.</p>
        </div>
      ) : (
        <div>
          <Button 
            onClick={handleGeneratePortal} 
            disabled={isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Client Portal Access'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClientPortalGenerator;
