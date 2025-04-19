
import React from 'react';
import { Card } from '@/components/ui/card';
import { ClientPortalConditions } from './ClientPortalConditions';
import ClientPortalLoanProgress from './ClientPortalLoanProgress';
import { Upload, FileText, ClipboardCheck, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

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

  // This effect will now fetch company settings based on the creator ID
  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (!createdBy) return;

      try {
        // If we have a createdBy user ID, try to fetch their company settings
        const { data, error } = await supabase
          .from('company_settings')
          .select('*')
          .eq('user_id', createdBy)
          .single();

        if (error) {
          console.error('Error fetching company settings:', error);
          return;
        }

        if (data) {
          setSettings(data);
          console.log('Company settings loaded:', data);
        }
      } catch (error) {
        console.error('Error in fetchCompanySettings:', error);
      }
    };

    // If we already have a creator ID, fetch settings immediately
    if (createdBy) {
      fetchCompanySettings();
    } else {
      // If we don't have a creator ID but we have a leadId, try to get it from portal access
      const getCreatorFromPortalAccess = async () => {
        try {
          // Fix: Convert leadId to a number only for the query
          const numericLeadId = typeof leadId === 'string' ? parseInt(leadId, 10) : leadId;
          
          const { data, error } = await supabase
            .from('client_portal_access')
            .select('created_by')
            .eq('lead_id', numericLeadId)
            .single();

          if (error) {
            console.error('Error fetching portal creator:', error);
            return;
          }

          // Fix: Check if data exists and has the created_by property
          if (data && data.created_by) {
            // Now fetch the company settings with this user ID
            const { data: companyData, error: companyError } = await supabase
              .from('company_settings')
              .select('*')
              .eq('user_id', data.created_by)
              .single();

            if (companyError) {
              console.error('Error fetching company settings:', companyError);
              return;
            }

            if (companyData) {
              setSettings(companyData);
              console.log('Company settings loaded from portal access:', companyData);
            }
          }
        } catch (error) {
          console.error('Error in getCreatorFromPortalAccess:', error);
        }
      };

      getCreatorFromPortalAccess();
    }
  }, [createdBy, leadId]);

  const refreshData = () => {
    console.log("Refreshing data...");
  };

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
      <ClientPortalConditions 
        leadId={leadId}
        refreshData={refreshData}
      />
    </div>
  );
};
