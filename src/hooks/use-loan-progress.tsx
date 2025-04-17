
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseLoanProgressOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useLoanProgress(options?: UseLoanProgressOptions) {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateLoanProgress = async (leadId: string | number, currentStep: string, notes?: string) => {
    if (!leadId || !currentStep) {
      const error = "Missing required parameters: leadId and currentStep";
      if (options?.onError) options.onError(error);
      return { success: false, error };
    }

    setIsUpdating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('update-loan-progress', {
        body: { 
          leadId, 
          currentStep,
          notes
        }
      });

      if (error) {
        console.error("Error updating loan progress:", error);
        const errorMessage = "Failed to update loan progress";
        toast.error(errorMessage);
        if (options?.onError) options.onError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (!data.success) {
        console.error("API returned error:", data.error);
        const errorMessage = data.error || "Failed to update loan progress";
        toast.error(errorMessage);
        if (options?.onError) options.onError(errorMessage);
        return { success: false, error: errorMessage };
      }

      toast.success(`Loan progress updated to ${currentStep.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`);
      
      if (options?.onSuccess) {
        options.onSuccess(data.data);
      }

      return { success: true, data: data.data };
    } catch (err: any) {
      console.error("Unexpected error updating loan progress:", err);
      const errorMessage = err.message || "An unexpected error occurred";
      toast.error(errorMessage);
      if (options?.onError) options.onError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateLoanProgress,
    isUpdating
  };
}
