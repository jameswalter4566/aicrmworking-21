
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClientPortalContent } from '@/components/mortgage/ClientPortalContent';
import ClientPortalSidebar from '@/components/mortgage/ClientPortalSidebar';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ClientPortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [leadId, setLeadId] = useState<number | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [isInPipeline, setIsInPipeline] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [activeAppSection, setActiveAppSection] = useState('personal-info');

  useEffect(() => {
    const verifyAccess = async () => {
      if (!token) {
        navigate('/client-portal/landing');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('generate-client-portal', {
          body: { action: 'verify', token }
        });

        if (error || !data.success) {
          console.error('Error verifying token:', error || data.error);
          toast.error('Access denied. Invalid or expired token.');
          navigate('/client-portal/landing');
          return;
        }

        // Set the lead ID from the valid token response
        setLeadId(data.leadId);
        if (data.createdBy) {
          setCreatedBy(data.createdBy);
        }
        
        // Check if lead is in the pipeline
        if (data.isInPipeline !== undefined) {
          setIsInPipeline(data.isInPipeline);
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error in verifyAccess:', error);
        toast.error('Something went wrong. Please try again.');
        navigate('/client-portal/landing');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAccess();
  }, [token, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || leadId === null) {
    return null; // This will redirect anyway from the useEffect
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ClientPortalSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeAppSection={activeAppSection}
        setActiveAppSection={setActiveAppSection}
      />
      <main className="flex-grow overflow-auto p-6">
        <ClientPortalContent 
          leadId={leadId} 
          isInPipeline={isInPipeline} 
          createdBy={createdBy}
          activeSection={activeTab === 'application' ? activeAppSection : undefined}
        />
      </main>
    </div>
  );
};

export default ClientPortal;
