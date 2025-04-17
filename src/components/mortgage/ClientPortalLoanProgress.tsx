
import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Circle } from "lucide-react";

interface ClientPortalLoanProgressProps {
  leadId: string | number;
  className?: string;
  displayStyle?: 'compact' | 'full';
}

const progressSteps = [
  "Application Created", 
  "Disclosures Sent",
  "Disclosures Signed",
  "Submitted",
  "Processing",
  "Approved",
  "CD Generated",
  "CD Signed",
  "CTC",
  "Docs Out",
  "Closing",
  "FUNDED"
];

// Map from API progress steps to display labels
const progressStepMap: Record<string, string> = {
  "applicationCreated": "Application Created",
  "disclosuresSent": "Disclosures Sent",
  "disclosuresSigned": "Disclosures Signed", 
  "submitted": "Submitted",
  "processing": "Processing",
  "approved": "Approved",
  "closingDisclosureGenerated": "CD Generated",
  "closingDisclosureSigned": "CD Signed",
  "ctc": "CTC",
  "docsOut": "Docs Out",
  "closing": "Closing",
  "funded": "FUNDED"
};

const ClientPortalLoanProgress: React.FC<ClientPortalLoanProgressProps> = ({ 
  leadId,
  className = "",
  displayStyle = 'full'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<{
    currentStep: string;
    progressPercentage: number;
    stepIndex: number;
  }>({
    currentStep: "applicationCreated",
    progressPercentage: 0,
    stepIndex: 0
  });

  useEffect(() => {
    const fetchLoanProgress = async () => {
      if (!leadId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase.functions.invoke('retrieve-loan-progress', {
          body: { leadId }
        });

        if (error || !data.success) {
          console.error("Error fetching loan progress:", error || data?.error);
          setError("Failed to load loan progress");
          return;
        }

        setProgressData({
          currentStep: data.data.currentStep,
          progressPercentage: data.data.progressPercentage,
          stepIndex: data.data.stepIndex
        });
      } catch (err) {
        console.error("Unexpected error fetching loan progress:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchLoanProgress();
  }, [leadId]);

  if (loading) {
    return (
      <div className={className}>
        <Skeleton className="h-2 w-full mb-4" />
        {displayStyle === 'full' && (
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-6 w-6 rounded-full" />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-500">Unable to load loan progress</div>;
  }

  // Get display label for current step
  const currentStepLabel = progressStepMap[progressData.currentStep] || "Application Created";

  if (displayStyle === 'compact') {
    return (
      <div className={`w-full ${className}`}>
        <div className="mb-1 flex justify-between items-center">
          <span className="text-xs font-medium text-mortgage-darkPurple">
            {currentStepLabel}
          </span>
          <span className="text-xs text-gray-500">
            {Math.round(progressData.progressPercentage)}%
          </span>
        </div>
        <Progress value={progressData.progressPercentage} className="h-2 bg-gray-200" />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between mb-1 text-sm">
            <span className="font-medium text-mortgage-darkPurple">{currentStepLabel}</span>
            <span className="text-gray-500">{Math.round(progressData.progressPercentage)}% Complete</span>
          </div>
          <Progress value={progressData.progressPercentage} className="h-2.5 bg-gray-200" />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {progressSteps.map((step, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border ${
                index <= progressData.stepIndex 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              } flex items-center space-x-2`}
            >
              {index <= progressData.stepIndex ? (
                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
              ) : (
                <Circle size={16} className="text-gray-300 flex-shrink-0" />
              )}
              <span className={`text-sm ${
                index <= progressData.stepIndex 
                  ? 'text-green-800' 
                  : 'text-gray-500'
              }`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ClientPortalLoanProgress;
