
import React from "react";
import Smart1003BuilderDropbox from "../../Smart1003BuilderDropbox";
import { Button } from "@/components/ui/button";

interface Smart1003DropStepProps {
  leadId: string | number;
  onContinue: () => void;
}

const Smart1003DropStep: React.FC<Smart1003DropStepProps> = ({ leadId, onContinue }) => {
  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-blue-800">
        Upload Your Docs for Smart 1003 Builder
      </h2>
      <p className="mb-4 text-center text-gray-700">
        Upload your documents to auto-fill the application, or continue to fill it out manually.
      </p>
      <div className="mb-6 w-full max-w-lg">
        <Smart1003BuilderDropbox leadId={String(leadId)} />
      </div>
      <Button
        variant="default"    // solid background button variant
        size="lg"            // larger size
        className="mt-2 px-8 py-2.5" // Added more padding for a larger button
        onClick={onContinue}
      >
        Skip and Fill Out Manually
      </Button>
    </div>
  );
};

export default Smart1003DropStep;
