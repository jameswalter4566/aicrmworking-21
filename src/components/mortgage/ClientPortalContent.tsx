import React from 'react';
import { Card } from '@/components/ui/card';
import { ClientPortalConditions } from './ClientPortalConditions';
import ClientPortalLoanProgress from './ClientPortalLoanProgress';
import { Upload, FileText, ClipboardCheck, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import Mortgage1003Form from './Mortgage1003Form';
import { toast } from 'sonner';
import ClientPortalSidebar from './ClientPortalSidebar';

interface CompanySettings {
  company_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

interface ClientPortalContentProps {
  leadId: string | number;
  isInPipeline?: boolean;
  createdBy?: string;
}

const PrePipelineMessage = ({ title, description, settings }: { title: string; description: string; settings: CompanySettings }) => {
  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <h3 className="text-xl font-semibold" style={{ color: settings.primary_color }}>{title}</h3>
        <p className="text-gray-600">{description}</p>
        <Button 
          className="hover:bg-opacity-90" 
          style={{ backgroundColor: settings.primary_color }}>
          <Upload className="mr-2 h-4 w-4" />
          Start Your Application
        </Button>
      </div>
    </Card>
  );
};

export const ClientPortalContent = ({ leadId, isInPipeline = false, createdBy }: ClientPortalContentProps) => {
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: 'Your Mortgage Company',
    primary_color: '#33C3F0',
    secondary_color: '#8B5CF6',
    accent_color: '#EA384C',
  });
  const [leadData, setLeadData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("application");
  const [activeAppSection, setActiveAppSection] = useState("personal-info");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        if (leadId) {
          console.log("Fetching initial lead data in ClientPortalContent for ID:", leadId);
          
          await fetchLeadProfile();
        }
        
        if (createdBy) {
          const { data, error } = await supabase
            .from('company_settings')
            .select('*')
            .eq('user_id', createdBy)
            .single();
  
          if (error) {
            console.error('Error fetching company settings:', error);
          } else if (data) {
            setSettings(data);
          }
        } else if (leadId) {
          const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
          
          const { data, error } = await supabase
            .from('client_portal_access')
            .select('created_by')
            .eq('lead_id', numericLeadId)
            .maybeSingle();
  
          if (error) {
            console.error('Error fetching portal creator:', error);
          } else if (data && 'created_by' in data && data.created_by) {
            const creatorId = String(data.created_by);
            
            const { data: companyData, error: companyError } = await supabase
              .from('company_settings')
              .select('*')
              .eq('user_id', creatorId)
              .maybeSingle();
  
            if (companyError) {
              console.error('Error fetching company settings:', companyError);
            } else if (companyData) {
              setSettings(companyData);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    const refreshInterval = setInterval(() => {
      if (leadId) {
        refreshData();
      }
    }, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [createdBy, leadId]);

  const fetchLeadProfile = async () => {
    if (!leadId) return;
    
    try {
      const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
      
      console.log("Explicitly calling lead-profile for ID:", numericLeadId);
      
      // Call both functions - the original lead-profile and our test function
      const [leadProfileResponse, testFunctionResponse] = await Promise.allSettled([
        supabase.functions.invoke('lead-profile', {
          body: { id: numericLeadId }
        }),
        supabase.functions.invoke('test-edgefunction', {
          body: { id: numericLeadId, timestamp: new Date().toISOString(), source: 'fetchLeadProfile' }
        })
      ]);
      
      console.log("Response from lead-profile:", 
        leadProfileResponse.status === 'fulfilled' ? leadProfileResponse.value : "Promise rejected", 
        leadProfileResponse.status === 'rejected' ? leadProfileResponse.reason : "");
      
      console.log("Response from test-edgefunction:", 
        testFunctionResponse.status === 'fulfilled' ? testFunctionResponse.value : "Promise rejected", 
        testFunctionResponse.status === 'rejected' ? testFunctionResponse.reason : "");
      
      // Process lead-profile response if fulfilled
      if (leadProfileResponse.status === 'fulfilled') {
        const { data: leadResponse, error: leadError } = leadProfileResponse.value;
        
        if (leadError) {
          console.error('Error fetching lead data:', leadError);
          toast.error('Failed to load mortgage data');
          return;
        } 
        
        if (leadResponse?.success && leadResponse?.data?.lead) {
          console.log("Retrieved lead data for client portal content:", leadResponse.data.lead);
          setLeadData(leadResponse.data.lead);
        } else {
          console.error('Invalid lead data response:', leadResponse);
          toast.error('Could not retrieve mortgage data');
        }
      } else {
        console.error('Lead profile request rejected:', leadProfileResponse.reason);
        toast.error('Failed to load mortgage data');
      }
    } catch (error) {
      console.error('Error in fetchLeadProfile:', error);
      toast.error('Failed to load lead profile');
    }
  };

  const handleSaveMortgageData = async (section: string, data: Record<string, any>) => {
    if (!leadId || !leadData) return;
    
    try {
      setIsSaving(true);
      
      const currentMortgageData = leadData.mortgageData || {};
      
      let updatedMortgageData = { ...currentMortgageData };
      
      if (section === "borrower") {
        updatedMortgageData = {
          ...updatedMortgageData,
          borrower: {
            ...updatedMortgageData.borrower,
            ...data
          }
        };
      } else {
        updatedMortgageData = {
          ...updatedMortgageData,
          [section]: data
        };
      }
      
      console.log("Saving mortgage data in client portal:", updatedMortgageData);
      
      const { data: responseData, error } = await supabase.functions.invoke('update-lead', {
        body: { 
          leadId, 
          leadData: { mortgageData: updatedMortgageData }
        }
      });
      
      if (error || !responseData.success) {
        throw new Error(error || responseData?.error || "Failed to update mortgage information");
      }
      
      setLeadData(prev => ({
        ...prev,
        mortgageData: updatedMortgageData
      }));
      
      toast.success(`${section} information saved successfully`);
    } catch (error) {
      console.error("Error updating mortgage data:", error);
      toast.error(`Failed to update ${section} information`);
    } finally {
      setIsSaving(false);
    }
  };

  const refreshData = async () => {
    if (!leadId) return;
    
    try {
      await fetchLeadProfile();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleApplicationClick = async () => {
    if (!leadId) return;
    try {
      console.log("Manually firing lead-profile for Application tab", leadId);
      
      // Call both functions when application is clicked
      const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
      
      const [leadProfileResult, testFunctionResult] = await Promise.allSettled([
        fetchLeadProfile(),
        supabase.functions.invoke('test-edgefunction', {
          body: { id: numericLeadId, timestamp: new Date().toISOString(), source: 'applicationClick' }
        })
      ]);
      
      console.log("Application click - test function result:", 
        testFunctionResult.status === 'fulfilled' ? testFunctionResult.value : "Promise rejected",
        testFunctionResult.status === 'rejected' ? testFunctionResult.reason : "");
        
    } catch (error) {
      console.error('Error firing lead-profile from Application click:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!isInPipeline) {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: settings.primary_color }}>
              Welcome to {settings.company_name}
            </h2>
            <p className="text-gray-600">
              Start your journey towards homeownership by uploading your documents and completing your application.
              Once submitted, you'll have access to track your loan progress and manage conditions.
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PrePipelineMessage 
            title="Loan Progress"
            description="After submitting your application, you'll be able to track your loan progress here."
            settings={settings}
          />
          
          <PrePipelineMessage
            title="Loan Conditions"
            description="Once your application is in process, you'll see your required conditions here."
            settings={settings}
          />
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <h3 
              className="text-xl font-semibold"
              style={{ color: settings.primary_color }}
            >
              Get Started
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                className="w-full hover:bg-opacity-90" 
                style={{ backgroundColor: settings.primary_color }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Documents
              </Button>
              <Button 
                className="w-full hover:bg-opacity-90" 
                style={{ backgroundColor: settings.secondary_color }}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Payment Calculator
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="fixed left-0 top-0 z-20">
        <ClientPortalSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          urgentCount={0}
          activeAppSection={activeAppSection}
          setActiveAppSection={setActiveAppSection}
          onApplicationClick={handleApplicationClick}
          leadId={leadId}
        />
      </div>
      <div className="ml-72"> 
        <div className="text-center mb-8">
          <h1 
            className="text-2xl font-bold mb-2"
            style={{ color: settings.primary_color }}
          >
            {settings.company_name}
          </h1>
        </div>
        <ClientPortalLoanProgress 
          leadId={leadId} 
          className="mb-6" 
        />
        
        {leadData && (
          <Card className="mb-6">
            <Mortgage1003Form 
              lead={leadData}
              onSave={handleSaveMortgageData}
              isEditable={true}
              isSaving={isSaving}
            />
          </Card>
        )}
        
        <ClientPortalConditions 
          leadId={leadId}
          refreshData={refreshData}
        />
      </div>
    </div>
  );
};
