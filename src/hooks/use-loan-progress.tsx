
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LoanProgressData {
  currentStep: string;
  stepIndex: number;
  progressPercentage: number;
  updatedAt?: string;
  leadId: string | number;
  firstName?: string;
  lastName?: string;
  propertyAddress?: string;
  activities?: any[];
  allSteps?: string[];
}

interface UseLoanProgressOptions {
  onSuccess?: (data: LoanProgressData) => void;
  onError?: (error: string) => void;
}

export function useLoanProgress(options?: UseLoanProgressOptions) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressData, setProgressData] = useState<LoanProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      // Update local state if needed
      setProgressData(data.data);

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

  const fetchLoanProgress = async (leadId: string | number) => {
    if (!leadId) {
      console.warn("Missing leadId parameter, will use default values");
      // Return a default object with empty values instead of failing completely
      const defaultData = {
        leadId: "unknown",
        currentStep: "applicationCreated",
        stepIndex: 0,
        progressPercentage: 0,
        allSteps: ["applicationCreated", "disclosuresSent", "disclosuresSigned", "submitted", "processing", 
                 "approved", "closingDisclosureGenerated", "closingDisclosureSigned", "ctc", "docsOut", 
                 "closing", "funded"]
      };
      
      setProgressData(defaultData);
      return { success: true, data: defaultData };
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('retrieve-loan-progress', {
        body: { leadId }
      });

      if (error) {
        console.error("Error fetching loan progress:", error);
        const errorMsg = "Failed to load loan progress";
        setError(errorMsg);
        if (options?.onError) options.onError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Even if the lead was not found, the function returns a data object with default values
      // We'll still consider this a "success" from the client's perspective
      if (data && data.data) {
        setProgressData(data.data);
        
        if (options?.onSuccess) {
          options.onSuccess(data.data);
        }
        
        return { success: true, data: data.data };
      }

      // If we don't have data for some reason, return a default object
      console.warn("No data returned from retrieve-loan-progress");
      const defaultData = {
        leadId: leadId.toString(),
        currentStep: "applicationCreated",
        stepIndex: 0,
        progressPercentage: 0,
        allSteps: ["applicationCreated", "disclosuresSent", "disclosuresSigned", "submitted", "processing", 
                 "approved", "closingDisclosureGenerated", "closingDisclosureSigned", "ctc", "docsOut", 
                 "closing", "funded"]
      };
      
      setProgressData(defaultData);
      return { success: true, data: defaultData };

    } catch (err: any) {
      console.error("Unexpected error fetching loan progress:", err);
      const errorMsg = err.message || "An unexpected error occurred";
      setError(errorMsg);
      if (options?.onError) options.onError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateLoanProgress,
    fetchLoanProgress,
    isUpdating,
    isLoading,
    progressData,
    error
  };
}
