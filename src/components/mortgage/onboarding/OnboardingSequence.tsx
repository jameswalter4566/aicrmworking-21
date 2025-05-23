import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TransactionTypeStep from './steps/TransactionTypeStep';
import WelcomeStep from './steps/WelcomeStep';
import ContactInfoStep from './steps/ContactInfoStep';
import PropertyInfoStep from './steps/PropertyInfoStep';
import MortgageInfoStep from './steps/MortgageInfoStep';
import FinancialInfoStep from './steps/FinancialInfoStep';
import EstHomeValueStep from './steps/EstHomeValueStep';
import MaritalStatusStep from './steps/MaritalStatusStep';
import BorrowerIdentityStep from './steps/BorrowerIdentityStep';
import Smart1003DropStep from "./steps/Smart1003DropStep";
import { LeadProfile } from '@/services/leadProfile';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type TransactionType = "buy_home" | "refinance" | "cash_out";

interface OnboardingSequenceProps {
  leadId: string | number;
  initialData?: Partial<LeadProfile>;
  onComplete: (onboardingData: any) => void;
}

// Steps *AFTER* TransactionTypeStep (progress starts there)
const stepLabels = [
  "Welcome",
  "Contact Info",
  "Property Info",
  "Estimate Home Value",
  "Mortgage Info",
  "Marital Status",
  "Borrower Identity",
  "Financial Info",
];

export const OnboardingSequence = ({ leadId, initialData, onComplete }: OnboardingSequenceProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [leadData, setLeadData] = useState<Partial<LeadProfile>>(initialData || {});
  const [isLoading, setIsLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);

  useEffect(() => {
    const fetchLeadData = async () => {
      if (initialData) {
        console.log("Using initialData in OnboardingSequence:", initialData);
        setLeadData(initialData);
        return;
      }
      try {
        const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
        console.log("Fetching lead data in OnboardingSequence for ID:", numericLeadId);
        
        const { data: response, error } = await supabase.functions.invoke('lead-profile', {
          body: { id: numericLeadId }
        });
        
        if (error) {
          console.error("Error fetching lead data:", error);
          return;
        }
        
        if (response?.success && response?.data?.lead) {
          console.log("Successfully retrieved lead data:", response.data.lead);
          setLeadData(response.data.lead);
        }
      } catch (error) {
        console.error('Error fetching lead data:', error);
      }
    };
    fetchLeadData();
  }, [leadId, initialData]);

  const handleStepSave = async (stepData: Partial<LeadProfile>) => {
    setIsLoading(true);
    try {
      const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
      console.log("Saving onboarding step data:", stepData);
      
      // Start with current mortgage data
      const currentMortgageData = leadData?.mortgageData || {};
      let updatedMortgageData = { ...currentMortgageData };
      
      // If we're updating borrower data, use the correct structure
      if (stepData.mortgageData?.borrower) {
        updatedMortgageData = {
          ...updatedMortgageData,
          borrower: {
            ...updatedMortgageData.borrower,
            ...stepData.mortgageData.borrower
          }
        };
      } 
      // Otherwise merge normally
      else if (stepData.mortgageData) {
        updatedMortgageData = {
          ...updatedMortgageData,
          ...stepData.mortgageData
        };
      }
      
      const requestPayload = {
        ...stepData,
        mortgageData: updatedMortgageData
      };
      
      console.log("Final request payload for step save:", requestPayload);
      
      const { data: response, error } = await supabase.functions.invoke('update-lead', {
        body: {
          leadId: numericLeadId,
          leadData: requestPayload
        }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      if (!response.success) {
        throw new Error(response.error || "Failed to save step data");
      }

      setLeadData(prev => ({
        ...prev,
        ...stepData,
        mortgageData: updatedMortgageData
      }));
      
      setCurrentStep(prev => prev + 1);
    } catch (error) {
      console.error('Error saving step data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (onboardingData: any) => {
    try {
      // Generate pitch deck after successful onboarding
      console.log("Attempting to generate pitch deck for lead ID:", leadId);
      const { data: pitchDeckResponse, error: pitchDeckError } = await supabase.functions.invoke('generate-pitch-deck', {
        body: { 
          leadId,
          source: "onboarding_completion",
          timestamp: new Date().toISOString()
        }
      });

      if (pitchDeckError) {
        console.error('Error generating pitch deck:', pitchDeckError);
        toast.error('Could not generate pitch deck automatically');
      } else if (pitchDeckResponse?.success) {
        console.log("Pitch deck generated successfully:", pitchDeckResponse);
        toast.success('Pitch deck generated successfully');
      } else {
        console.warn("Pitch deck generation returned no error but may not have completed successfully:", pitchDeckResponse);
        toast.success('Onboarding complete!');
      }
      
      onComplete(onboardingData);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Error saving your information');
    }
  };

  const handleFinishClick = async () => {
    try {
      const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
      
      // Send SMS notification
      const { error } = await supabase.functions.invoke('loan-onboarding-completed', {
        body: { 
          leadId: numericLeadId,
          clientName: `${leadData.firstName || ''} ${leadData.lastName || ''}`
        }
      });

      if (error) {
        console.error('Error sending completion notification:', error);
      }

      // Call the original onComplete handler
      handleOnboardingComplete(leadData);
    } catch (error) {
      console.error('Error in finish click:', error);
      toast.error('Error completing onboarding');
    }
  };

  // ---- PROGRESS LOGIC ----
  // Progress bar displayed *starting on* WelcomeStep (currentStep >= 1)
  const stepsTotal = 7; // Updated for the new step
  const progressStepIndex = Math.max(0, currentStep - 1); // 'Welcome' is first progress step
  const progressPercent = Math.round((progressStepIndex / stepsTotal) * 100);

  // BLUE STYLES
  const bgColor = "bg-[#f3f7fa]"; // very light blue
  const cardBg = "bg-white/60 backdrop-blur"; // softer, slight glass effect
  const mainBlue = "text-[#1769aa]"; // deep blue 

  // --- STEPS ---
  // Determine the return URL for the Smart1003Builder
  const currentPath = window.location.pathname;
  const isClientPortal = currentPath.includes('client-portal');
  const returnUrl = isClientPortal ? '/client-portal' : `/loan-application/${leadId}`;
  
  // We add Smart1003DropStep after TransactionTypeStep and before WelcomeStep
  const steps = [
    <TransactionTypeStep
      key="transaction-type"
      selectedType={transactionType}
      onSelect={(type) => {
        setTransactionType(type);
        setCurrentStep(1); // Move to upload smart builder step
      }}
    />,
    <Smart1003DropStep
      key="smart-1003-dropbox"
      leadId={leadId}
      onContinue={() => setCurrentStep(2)}
      returnUrl={returnUrl}
    />,
    <WelcomeStep
      key="welcome"
      leadData={leadData}
      onNext={handleStepSave}
      headingClass={mainBlue}
      subtitleClass={mainBlue + " font-medium"}
    />,
    <ContactInfoStep key="contact" leadData={leadData} onSave={handleStepSave} />,
    <PropertyInfoStep key="property" leadData={leadData} onSave={handleStepSave} blueStyle />,
    <EstHomeValueStep key="est-home-value" leadData={leadData} onSave={handleStepSave} />,
    <MortgageInfoStep key="mortgage" leadData={leadData} onSave={handleStepSave} />,
    <MaritalStatusStep key="marital-status" leadData={leadData} onSave={handleStepSave} />,
    <BorrowerIdentityStep key="identity" leadData={leadData} onSave={handleStepSave} />,
    <FinancialInfoStep key="financial" leadData={leadData} onSave={handleStepSave} />,
  ];

  if (currentStep >= steps.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Button 
          onClick={handleFinishClick}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
        >
          Finish Application
        </Button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor} py-12`}>
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Bar, shown on steps >= 2 (not for transaction or upload step) */}
        {currentStep >= 2 && (
          <div className="mb-5">
            <Progress value={progressPercent} className="h-2 bg-[#ddeaf6] [&>div]:bg-[#1769aa]" />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-[#1769aa] font-semibold">{progressPercent}%</span>
            </div>
          </div>
        )}
        <Card className={`p-6 ${cardBg} shadow-2xl rounded-2xl`}>
          {currentStep === 2 && (
            // Blue themed welcome text block for WelcomeStep only
            <div className="text-center mb-8">
              <h1 className={`text-3xl md:text-4xl font-extrabold mb-4 ${mainBlue}`}>
                Welcome to Your Mortgage Journey
              </h1>
              <h2 className={`text-lg md:text-xl mb-3 ${mainBlue}`}>
                Let's gather some information to get your mortgage process started
              </h2>
            </div>
          )}
          {steps[currentStep]}
          {isLoading && (
            <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-10">
              <div className="loading-spinner" />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OnboardingSequence;
