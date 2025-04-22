
import React from "react";
import Smart1003BuilderDropbox from "./Smart1003BuilderDropbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Smart1003DropStepProps {
  leadId: string | number;
  onContinue: () => void;
  returnUrl?: string;
}

const Smart1003DropStep: React.FC<Smart1003DropStepProps> = ({ leadId, onContinue, returnUrl }) => {
  const handleDocumentsProcessed = async () => {
    try {
      // Generate pitch deck after documents are processed
      console.log("Smart1003DropStep: Attempting to generate pitch deck for lead ID:", leadId);
      const { data, error: pitchDeckError } = await supabase.functions.invoke('generate-pitch-deck', {
        body: { 
          leadId,
          source: "smart1003_documents_processed",
          timestamp: new Date().toISOString()
        }
      });

      if (pitchDeckError) {
        console.error('Error generating pitch deck:', pitchDeckError);
        toast.error('Could not generate pitch deck automatically');
      } else if (data?.success) {
        console.log("Pitch deck generated successfully:", data);
        toast.success('Pitch deck generated successfully');
      } else {
        console.warn("Pitch deck generation returned no error but may have incomplete data:", data);
        toast.success('Documents processed');
      }
    } catch (error) {
      console.error('Error in document processing completion:', error);
    }
    
    onContinue();
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-blue-800">
        Upload Your Docs for Smart 1003 Builder
      </h2>
      <p className="mb-4 text-center text-gray-700">
        Upload your documents to auto-fill the application, or continue to fill it out manually.
      </p>
      <div className="mb-6 w-full max-w-lg">
        <Smart1003BuilderDropbox 
          leadId={String(leadId)} 
          returnUrl={returnUrl} 
          preserveMortgageStatus={true}
          isClientPortal={true}
          onProcessingComplete={handleDocumentsProcessed}
        />
      </div>
      <Button
        variant="default"
        size="lg"
        className="mt-4 px-10 py-3 bg-blue-600 hover:bg-blue-700 text-lg font-medium"
        onClick={onContinue}
      >
        Skip and Fill Out Manually
      </Button>
    </div>
  );
};

export default Smart1003DropStep;
