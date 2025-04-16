
import { supabase } from "@/integrations/supabase/client";

// Type for portal access data
export interface PortalAccess {
  id: string;
  lead_id: number;
  portal_slug: string;
  access_token: string;
  created_at: string;
  last_accessed_at?: string;
}

// Generate portal access for a lead
export const generateClientPortal = async (leadId: number): Promise<{
  url: string;
  portal: PortalAccess | null;
  error?: string;
}> => {
  try {
    // Check if lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .single();
    
    if (leadError || !lead) {
      return { url: '', portal: null, error: 'Lead not found' };
    }
    
    // Call the edge function to generate the portal
    const { data, error } = await supabase.functions.invoke('generate-client-portal', {
      body: { leadId }
    });
    
    if (error) {
      console.error("Error generating portal:", error);
      return { url: '', portal: null, error: error.message };
    }
    
    // Return the portal URL and data
    return {
      url: data.url,
      portal: data.portal
    };
  } catch (error) {
    console.error("Error in generateClientPortal:", error);
    return { 
      url: '', 
      portal: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Get portal access for a specific slug and token
export const getPortalAccess = async (slug: string, token: string): Promise<{
  access: PortalAccess | null;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('client_portal_access')
      .select('*')
      .eq('portal_slug', slug)
      .eq('access_token', token)
      .single();
    
    if (error) {
      return { access: null, error: 'Invalid or expired portal access' };
    }
    
    return { access: data };
  } catch (error) {
    return { 
      access: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Function to update the last accessed timestamp
export const updateLastAccessed = async (portalId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('client_portal_access')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', portalId);
    
    return !error;
  } catch (error) {
    console.error("Error updating last accessed:", error);
    return false;
  }
};
