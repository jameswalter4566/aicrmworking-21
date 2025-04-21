
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { getPortalAccess } from '@/utils/clientPortalUtils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Step components imports
import { OnboardingSequence } from '@/components/mortgage/onboarding/OnboardingSequence';

const ClientPortalOnboarding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [portalAccess, setPortalAccess] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);

  useEffect(() => {
    const validateAccess = async () => {
      if (!slug || !token) {
        toast.error('Invalid access');
        navigate('/client-portal-landing');
        return;
      }

      try {
        setIsLoading(true);
        const { access, error } = await getPortalAccess(slug, token);
        
        if (error || !access) {
          toast.error('Invalid or expired portal access');
          navigate('/client-portal-landing');
          return;
        }

        setPortalAccess(access);
        
        // Fetch lead data if available
        if (access.lead_id) {
          console.log("Fetching lead data for ID:", access.lead_id);
          // Use lead-profile edge function to get complete lead data including full mortgage data
          const { data: response, error: leadError } = await supabase.functions.invoke('lead-profile', {
            body: { id: access.lead_id }
          });
          
          if (!leadError && response?.success && response?.data?.lead) {
            console.log("Successfully retrieved lead data:", response.data.lead);
            setLeadData(response.data.lead);
          } else {
            console.error("Error fetching complete lead data:", leadError || response?.error);
          }
        }
      } catch (error) {
        console.error('Error validating portal access:', error);
        toast.error('Error validating access');
      } finally {
        setIsLoading(false);
      }
    };
    
    validateAccess();
  }, [slug, token, navigate]);

  const handleOnboardingComplete = async (onboardingData: any) => {
    try {
      if (!portalAccess?.lead_id) {
        toast.error('Missing lead information');
        return;
      }
      
      // Preserve existing mortgage data that might not be part of the onboarding
      const combinedMortgageData = {
        ...(leadData?.mortgageData || {}),
        ...onboardingData
      };
      
      console.log("Saving onboarding data:", combinedMortgageData);
      
      // Update lead with combined onboarding data
      const { error } = await supabase.functions.invoke('update-lead', {
        body: { 
          leadId: portalAccess.lead_id, 
          leadData: { 
            mortgageData: combinedMortgageData,
            is_mortgage_lead: true,
            added_to_pipeline_at: new Date().toISOString()
          }
        }
      });
        
      if (error) {
        throw new Error(error.message);
      }
      
      toast.success('Onboarding complete!');
      
      // Redirect to dashboard with the token
      navigate(`/client-portal/dashboard/${slug}?token=${token}`);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Error saving your information');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 size={48} className="animate-spin text-emerald-500 mb-4" />
          <p className="text-lg">Loading your onboarding process...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b pb-4">
            <CardTitle className="text-2xl font-bold text-emerald-600">
              Welcome to Your Mortgage Journey
            </CardTitle>
            <CardDescription>
              Let's gather some information to get your mortgage process started
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            <OnboardingSequence 
              leadId={portalAccess?.lead_id}
              initialData={leadData} 
              onComplete={handleOnboardingComplete}
            />
          </CardContent>
          
          <CardFooter className="border-t pt-4 flex justify-between">
            <Button variant="outline" onClick={() => navigate('/client-portal-landing')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portal
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ClientPortalOnboarding;
