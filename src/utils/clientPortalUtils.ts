import { supabase } from "@/integrations/supabase/client";

export interface PortalAccess {
  id: string;
  lead_id: number;
  portal_slug: string;
  access_token: string;
  created_at: string;
  last_accessed_at?: string;
  created_by?: string;
}

export const generateClientPortal = async (leadId: number, createdBy?: string): Promise<{
  url: string;
  portal: PortalAccess | null;
  error?: string;
}> => {
  try {
    console.log('Generating portal for lead ID:', leadId);
    
    // Check if lead exists
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .single();
    
    if (leadError) {
      console.error("Error checking lead:", leadError);
      return { url: '', portal: null, error: 'Lead not found: ' + leadError.message };
    }
    
    if (!lead) {
      return { url: '', portal: null, error: 'Lead not found' };
    }
    
    // Call the edge function to generate the portal
    const { data, error } = await supabase.functions.invoke('generate-client-portal', {
      body: { leadId, createdBy }
    });
    
    if (error) {
      console.error("Error generating portal:", error);
      return { url: '', portal: null, error: error.message };
    }
    
    if (!data || !data.portal) {
      console.error("Invalid response from generate-client-portal:", data);
      return { url: '', portal: null, error: 'Invalid response from server' };
    }
    
    // Generate a URL that directs to the client portal landing page
    // Extract just the slug from the generated URL
    const slug = data.url.split('/client-portal/')[1]?.split('?')[0] || '';
    
    // Create a landing page URL with the slug and token
    const fullPortalUrl = `${window.location.origin}/client-portal/${slug}?token=${data.portal.access_token}`;
    
    console.log("Generated portal URL:", fullPortalUrl);
    
    // Return the portal URL and data
    return {
      url: fullPortalUrl,
      portal: data.portal
    };
  } catch (error) {
    console.error("Error in generateClientPortal:", error);
    return { 
      url: '', 
      portal: null, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
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
