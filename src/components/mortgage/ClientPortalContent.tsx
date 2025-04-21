
import React from 'react';
import { Card } from '@/components/ui/card';
import { ClientPortalConditions } from './ClientPortalConditions';
import ClientPortalLoanProgress from './ClientPortalLoanProgress';
import { Upload, FileText, ClipboardCheck, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import EmploymentIncomeSection from './client-portal/EmploymentIncomeSection';
import PersonalInfoPlaceholder from './client-portal/PersonalInfoPlaceholder';  // Fix import here

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
  activeSection?: string;
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

export const ClientPortalContent = ({ leadId, isInPipeline = false, createdBy, activeSection }: ClientPortalContentProps) => {
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: 'Your Mortgage Company',
    primary_color: '#33C3F0',
    secondary_color: '#8B5CF6',
    accent_color: '#EA384C',
  });

  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (!createdBy) return;

      try {
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

    if (createdBy) {
      fetchCompanySettings();
    } else {
      const getCreatorFromPortalAccess = async () => {
        try {
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

          if (data && 'created_by' in data && data.created_by) {
            const creatorId = String(data.created_by);
            
            const { data: companyData, error: companyError } = await supabase
              .from('company_settings')
              .select('*')
              .eq('user_id', creatorId)
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

  // Always render these placeholders, do not conditionally render:
  return (
    <div className="space-y-6">
      {/* Show header if not in pipeline */}
      {!isInPipeline && (
        <>
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
        </>
      )}

      {/* Always render both sections no matter activeSection or pipeline status */}
      <PersonalInfoPlaceholder />
      <EmploymentIncomeSection />

      {/* If in pipeline, render loan progress & conditions */}
      {isInPipeline && (
        <>
          <ClientPortalLoanProgress 
            leadId={leadId} 
            className="mb-6" 
          />
          <ClientPortalConditions 
            leadId={leadId}
            refreshData={refreshData}
          />
        </>
      )}
    </div>
  );
};
