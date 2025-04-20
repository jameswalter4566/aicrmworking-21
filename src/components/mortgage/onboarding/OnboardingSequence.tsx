
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientPortalContent } from "@/components/mortgage/ClientPortalContent";
import { LeadProfile } from "@/services/leadProfile";
import WelcomeStep from "./steps/WelcomeStep";
import ContactInfoStep from "./steps/ContactInfoStep";
import PropertyInfoStep from "./steps/PropertyInfoStep";
import MortgageInfoStep from "./steps/MortgageInfoStep";
import FinancialInfoStep from "./steps/FinancialInfoStep";
import CompletionStep from "./steps/CompletionStep";

interface OnboardingSequenceProps {
  leadId: string | number;
  accessToken?: string;
  portalId?: string;
  onComplete?: () => void;
}

export const OnboardingSequence = ({ leadId, accessToken, portalId, onComplete }: OnboardingSequenceProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [leadData, setLeadData] = useState<LeadProfile | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setIsLoading(true);
        
        // First verify portal access if token is provided
        if (accessToken) {
          const { data: portalData, error: portalError } = await supabase
            .from('client_portal_access')
            .select('*')
            .eq('lead_id', leadId)
            .eq('access_token', accessToken)
            .single();
            
          if (portalError || !portalData) {
            console.error("Portal access error:", portalError);
            setIsLoading(false);
            return;
          }
          
          setAuthenticated(true);
          
          // Update last accessed timestamp
          if (portalId) {
            await supabase
              .from('client_portal_access')
              .update({ last_accessed_at: new Date().toISOString() })
              .eq('id', portalId);
          }
        }

        // Convert leadId to number if it's a string to ensure compatibility
        const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;

        // Fetch lead data
        const { data, error } = await supabase.functions.invoke('lead-profile', {
          body: { id: numericLeadId }
        });

        if (error || !data.success) {
          console.error("Error fetching lead:", error || data.error);
          setIsLoading(false);
          return;
        }

        setLeadData(data.data.lead);
      } catch (error) {
        console.error("Error in fetchLeadData:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadData();
  }, [leadId, accessToken, portalId]);

  const updateLeadData = async (updatedData: Partial<LeadProfile>) => {
    try {
      setIsLoading(true);
      
      // Convert leadId to number if it's a string
      const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
      
      const { data, error } = await supabase.functions.invoke('update-lead', {
        body: { 
          leadId: numericLeadId, 
          leadData: updatedData
        }
      });

      if (error || !data.success) {
        console.error("Error updating lead:", error || data.error);
        return false;
      }

      // Update local state with new data
      setLeadData(prev => prev ? { ...prev, ...updatedData } : null);
      return true;
    } catch (error) {
      console.error("Error in updateLeadData:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleComplete = async () => {
    // Mark onboarding as completed in mortgage data
    const currentMortgageData = leadData?.mortgageData || {};
    
    const success = await updateLeadData({
      mortgageData: {
        ...currentMortgageData,
        onboardingCompleted: true
      }
    });

    if (success && onComplete) {
      onComplete();
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading your information...</p>
      </div>
    );
  }

  // Show error state if no lead data or authentication failed
  if (!leadData || (!authenticated && accessToken)) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-red-600">Access Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">
            We couldn't access your information. Please try again or contact your loan officer.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => navigate("/client-portal-landing")}>
            Return to Portal
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Check if the lead is already in pipeline
  const isInPipeline = leadData.isMortgageLead && leadData.addedToPipelineAt;

  // If lead is already in pipeline, show the regular client portal content
  if (isInPipeline) {
    return <ClientPortalContent leadId={leadId} isInPipeline={true} createdBy={leadData.createdBy} />;
  }

  // Check if onboarding is already completed
  const isOnboardingCompleted = leadData.mortgageData?.onboardingCompleted;
  
  if (isOnboardingCompleted) {
    return <ClientPortalContent leadId={leadId} isInPipeline={false} createdBy={leadData.createdBy} />;
  }

  // Define steps components with shared props
  const stepProps = {
    leadData,
    updateLeadData,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onComplete: handleComplete,
  };

  // Render current step
  const steps = [
    <WelcomeStep key="welcome" {...stepProps} />,
    <ContactInfoStep key="contact" {...stepProps} />,
    <PropertyInfoStep key="property" {...stepProps} />,
    <MortgageInfoStep key="mortgage" {...stepProps} />,
    <FinancialInfoStep key="financial" {...stepProps} />,
    <CompletionStep key="completion" {...stepProps} />
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-mortgage-darkPurple">
            Complete Your Application
          </CardTitle>
          <CardDescription className="text-center">
            Step {currentStep + 1} of {steps.length}
          </CardDescription>
          <div className="w-full bg-gray-200 h-2 rounded-full mt-4">
            <div 
              className="bg-mortgage-purple h-2 rounded-full transition-all" 
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {steps[currentStep]}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingSequence;
