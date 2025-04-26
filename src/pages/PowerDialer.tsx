
import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layouts/MainLayout';
import { ConnectedLeadPanel } from '@/components/power-dialer/ConnectedLeadPanel';
import { supabase } from '@/integrations/supabase/client';

const PowerDialer: React.FC = () => {
  const [activeCall, setActiveCall] = useState<{
    leadId?: string;
    callSid?: string;
    phoneNumber?: string;
    status?: string;
  }>({});
  
  const [connectedLeadData, setConnectedLeadData] = useState<{
    first_name?: string;
    last_name?: string;
    phone1?: string;
    email?: string;
    property_address?: string;
    mailing_address?: string;
  } | undefined>(undefined);
  
  const fetchLeadData = useCallback(async () => {
    if (!activeCall?.leadId) {
      console.log('[PowerDialer] No leadId available, cannot fetch lead data');
      return;
    }
    
    try {
      console.log('[PowerDialer] Fetching lead data for:', activeCall.leadId);
      console.log('[PowerDialer] Full active call data:', JSON.stringify(activeCall, null, 2));
      
      const { data, error } = await supabase.functions.invoke('lead-connected', {
        body: { 
          leadId: activeCall.leadId,
          callData: {
            callSid: activeCall.callSid,
            status: activeCall.status || 'unknown',
            timestamp: new Date().toISOString()
          }
        }
      });

      console.log('[PowerDialer] Raw response from lead-connected:', JSON.stringify(data, null, 2));
      console.log('[PowerDialer] Error (if any):', error);

      if (error) {
        console.error('[PowerDialer] Detailed error from lead-connected:', error);
        throw error;
      }
      
      if (data?.lead) {
        console.log('[PowerDialer] Lead data received:', JSON.stringify(data.lead, null, 2));
        
        const leadInfo = {
          first_name: data.lead.first_name || 'Unknown',
          last_name: data.lead.last_name || 'Contact',
          phone1: data.lead.phone1 || activeCall.phoneNumber || '---',
          email: data.lead.email || '---',
          property_address: data.lead.property_address || '---',
          mailing_address: data.lead.mailing_address || '---'
        };
        
        console.log('[PowerDialer] Processed lead info:', JSON.stringify(leadInfo, null, 2));
        
        setConnectedLeadData(leadInfo);
        console.log('[PowerDialer] State updated with lead data');
      } else {
        console.warn('[PowerDialer] No lead data found in response');
      }
    } catch (err) {
      console.error('[PowerDialer] Comprehensive error fetching lead data:', err);
    }
  }, [activeCall]);

  // For testing purposes, let's simulate an active call with a lead ID
  useEffect(() => {
    // This is just for development/testing
    // In a real scenario, this would come from an actual call
    const simulateCall = async () => {
      // Set a test activeCall state
      setActiveCall({
        leadId: '8d70fa79-6589-4a23-86cd-db7f85e362d3', // Example lead ID
        callSid: 'CA123456789',
        phoneNumber: '7142449021',
        status: 'in-progress'
      });
      
      console.log('[PowerDialer] Simulated call with test lead ID');
    };
    
    simulateCall();
  }, []);

  // Fetch lead data when activeCall changes
  useEffect(() => {
    if (activeCall?.leadId) {
      console.log('[PowerDialer] Active call state changed, fetching lead data...');
      fetchLeadData();
    }
  }, [activeCall, fetchLeadData]);

  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Power Dialer</h1>
        
        {/* Debug information */}
        <div className="bg-gray-100 p-4 mb-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Debug Info</h2>
          <div className="text-sm font-mono">
            <div>Active Call: {JSON.stringify(activeCall, null, 2)}</div>
            <div className="mt-2">Lead Data: {JSON.stringify(connectedLeadData, null, 2)}</div>
          </div>
        </div>
        
        {/* Lead Panel */}
        <ConnectedLeadPanel leadData={connectedLeadData} />
        
        {/* Call Controls would go here */}
      </div>
    </MainLayout>
  );
};

// Add default export to fix the first error
export default PowerDialer;
