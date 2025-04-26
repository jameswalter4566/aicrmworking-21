
const fetchLeadData = async () => {
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
};
