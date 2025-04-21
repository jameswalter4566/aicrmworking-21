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
      
      // If we're updating borrower data, use the special structure
      if (stepData.mortgageData?.borrower) {
        updatedMortgageData = {
          ...updatedMortgageData,
          borrower: {
            data: stepData.mortgageData.borrower,
            section: "personalInfo"
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
    onComplete(leadData);
    return null;
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
