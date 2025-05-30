
import React from "react";
import Smart1003BuilderDropbox from "../../Smart1003BuilderDropbox";
import { Button } from "@/components/ui/button";

interface Smart1003DropStepProps {
  leadId: string | number;
  onContinue: () => void;
  returnUrl?: string;
}

const Smart1003DropStep: React.FC<Smart1003DropStepProps> = ({ leadId, onContinue, returnUrl }) => {
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
          returnUrl={returnUrl || `/smart-document-manager/${leadId}`} 
          preserveMortgageStatus={true}
          isClientPortal={true} 
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
