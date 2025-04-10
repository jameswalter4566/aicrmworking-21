
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightToLine } from "lucide-react";
import { mortgageDealService } from "@/services/mortgageDealService";
import { toast } from "sonner";

interface PushToPipelineButtonProps {
  leadId: number;
  onSuccess?: () => void;
}

const PushToPipelineButton: React.FC<PushToPipelineButtonProps> = ({ leadId, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePushToPipeline = async () => {
    try {
      setIsLoading(true);
      await mortgageDealService.pushToPipeline(leadId);
      toast.success("Lead successfully pushed to mortgage pipeline");
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error pushing lead to pipeline:", error);
      toast.error("Failed to push lead to pipeline");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePushToPipeline} 
      disabled={isLoading} 
      className="bg-green-600 hover:bg-green-700 mt-4 w-full"
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
          Processing...
        </>
      ) : (
        <>
          <ArrowRightToLine className="mr-2 h-4 w-4" />
          Push to Pipeline
        </>
      )}
    </Button>
  );
};

export default PushToPipelineButton;
