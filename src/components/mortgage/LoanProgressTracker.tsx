
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Send,
  FileCheck,
  Upload,
  Settings,
  Check,
  FilePlus,
  FileUp,
  DoorClosed,
  BanknoteIcon,
  BadgeCheck
} from "lucide-react";

interface CheckpointProps {
  label: string;
  isCompleted: boolean;
  isActive: boolean;
  icon: React.ElementType;
}

interface LoanProgressTrackerProps {
  leadId: string | number;
  onProgressLoaded?: (progressData: any) => void;
  showLoader?: boolean;
  className?: string;
  displayStyle?: 'compact' | 'full'; // Add the displayStyle prop
}

const checkpoints = [
  { id: "applicationCreated", label: "Application Created", icon: FileText },
  { id: "disclosuresSent", label: "Disclosures Sent", icon: Send },
  { id: "disclosuresSigned", label: "Disclosures Signed", icon: FileCheck },
  { id: "submitted", label: "Submitted", icon: Upload },
  { id: "processing", label: "Processing", icon: Settings },
  { id: "approved", label: "Approved", icon: BadgeCheck },
  { id: "closingDisclosureGenerated", label: "CD Generated", icon: FilePlus },
  { id: "closingDisclosureSigned", label: "CD Signed", icon: FileCheck },
  { id: "ctc", label: "CTC", icon: Check },
  { id: "docsOut", label: "Docs Out", icon: FileUp },
  { id: "closing", label: "Closing", icon: DoorClosed },
  { id: "funded", label: "FUNDED", icon: BanknoteIcon },
];

const Checkpoint: React.FC<CheckpointProps> = ({ label, isCompleted, isActive, icon: Icon }) => {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs font-bold mb-2 text-gray-700 text-center">
        {label}
      </span>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors",
          isCompleted || isActive
            ? "bg-mortgage-purple text-white"
            : "bg-white border-2 border-gray-300 text-gray-400"
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
};

const LoanProgressTracker: React.FC<LoanProgressTrackerProps> = ({ 
  leadId, 
  onProgressLoaded,
  showLoader = false,
  className = "",
  displayStyle = 'full' // Set default value to 'full'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<{
    currentStep: string;
    progressPercentage: number;
  }>({
    currentStep: "applicationCreated",
    progressPercentage: (1 / checkpoints.length) * 100
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

        if (error) {
          console.error("Error fetching loan progress:", error);
          setError("Failed to load loan progress");
          return;
        }

        if (!data.success) {
          console.error("API returned error:", data.error);
          setError(data.error || "Failed to load loan progress");
          return;
        }

        // Calculate progress percentage correctly - we want the FULL current step to be covered
        const currentStepIndex = data.data.stepIndex;
        const totalSteps = checkpoints.length;
        
        // Calculate progress to include the entire current step
        // Add 1 to currentStepIndex to make sure the current checkpoint is fully covered
        const progressPercentage = ((currentStepIndex + 1) / totalSteps) * 100;
        
        setProgressData({
          currentStep: data.data.currentStep,
          progressPercentage: progressPercentage
        });
        
        // Notify parent component if callback provided
        if (onProgressLoaded) {
          onProgressLoaded({
            ...data.data,
            progressPercentage: progressPercentage
          });
        }
      } catch (err) {
        console.error("Unexpected error fetching loan progress:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchLoanProgress();
  }, [leadId, onProgressLoaded]);

  // Find the index of the current step
  const currentIndex = checkpoints.findIndex((checkpoint) => checkpoint.id === progressData.currentStep);
  
  // If current step is not found, default to first step
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  // For compact display style
  if (displayStyle === 'compact') {
    return (
      <div className={`w-full ${className}`}>
        <div className="mb-1 flex justify-between items-center">
          <span className="text-xs font-medium text-mortgage-darkPurple">
            {checkpoints[activeIndex].label}
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
    <div className={`w-full px-8 py-6 bg-white ${className}`}>
      <h3 className="text-lg font-bold mb-6 text-mortgage-darkPurple">Loan Progress</h3>
      
      {loading && showLoader ? (
        <div className="space-y-4">
          <Skeleton className="h-3 w-full" />
          <div className="flex justify-between mt-2">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="h-2 w-16 mb-2" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-sm">{error}</div>
      ) : (
        <>
          {/* Progress bar container with increased vertical spacing */}
          <div className="relative mb-8">
            <Progress 
              value={progressData.progressPercentage} 
              className="h-3 bg-gray-200" // Increased height from h-2 to h-3
            />
          </div>
          
          {/* Checkpoints */}
          <div className="flex justify-between mt-[-24px]"> {/* Adjusted negative margin */}
            {checkpoints.map((checkpoint, index) => (
              <Checkpoint
                key={checkpoint.id}
                label={checkpoint.label}
                icon={checkpoint.icon}
                isActive={index === activeIndex}
                isCompleted={index < activeIndex}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LoanProgressTracker;
