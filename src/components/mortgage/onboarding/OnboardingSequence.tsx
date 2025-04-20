
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WelcomeStep from './steps/WelcomeStep';
import ContactInfoStep from './steps/ContactInfoStep';
import PropertyInfoStep from './steps/PropertyInfoStep';
import MortgageInfoStep from './steps/MortgageInfoStep';
import FinancialInfoStep from './steps/FinancialInfoStep';
import { LeadProfile } from '@/services/leadProfile';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingSequenceProps {
  leadId: string | number;
  onComplete: () => void;
}

export const OnboardingSequence = ({ leadId, onComplete }: OnboardingSequenceProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [leadData, setLeadData] = useState<Partial<LeadProfile>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
        const { data: { success, data }, error } = await supabase.functions.invoke('lead-profile', {
          body: { id: numericLeadId }
        });

        if (success && data?.lead) {
          setLeadData(data.lead);
        }
      } catch (error) {
        console.error('Error fetching lead data:', error);
      }
    };

    fetchLeadData();
  }, [leadId]);

  const handleStepSave = async (stepData: Partial<LeadProfile>) => {
    setIsLoading(true);
    try {
      const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
      const { data: { success }, error } = await supabase.functions.invoke('update-lead', {
        body: { 
          leadId: numericLeadId,
          leadData: {
            ...stepData,
            // Preserve existing mortgage data
            mortgageData: {
              ...(leadData.mortgageData || {}),
              ...(stepData.mortgageData || {})
            }
          }
        }
      });

      if (success) {
        setLeadData(prev => ({
          ...prev,
          ...stepData
        }));
        setCurrentStep(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error saving step data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    <WelcomeStep key="welcome" leadData={leadData} onNext={handleStepSave} />,
    <ContactInfoStep key="contact" leadData={leadData} onSave={handleStepSave} />,
    <PropertyInfoStep key="property" leadData={leadData} onSave={handleStepSave} />,
    <MortgageInfoStep key="mortgage" leadData={leadData} onSave={handleStepSave} />,
    <FinancialInfoStep key="financial" leadData={leadData} onSave={handleStepSave} />,
  ];

  if (currentStep >= steps.length) {
    onComplete();
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Card className="p-6">
          {steps[currentStep]}
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <div className="loading-spinner" />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OnboardingSequence;
