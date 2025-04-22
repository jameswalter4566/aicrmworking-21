
import { supabase } from "@/integrations/supabase/client";

export interface BulkUpdateResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export interface ImportedLead {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  mailingAddress?: string;
  propertyAddress?: string;
  disposition?: string;
  avatar?: string;
  tags?: string[];
}

/**
 * Stores the provided leads using the Supabase Edge Function
 */
export async function storeImportedLeads(leads: ImportedLead[], leadType: string = "general") {
  try {
    // Get the current auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      console.error("No authentication token available. User must be logged in to store leads.");
      throw new Error("Authentication required. Please sign in to store leads.");
    }
    
    // Log that we have a token and are making the request
    console.log("Making authenticated request to store-leads with token:", token.substring(0, 10) + "...");
    
    // Call the Supabase Edge Function with the auth token
    const response = await supabase.functions.invoke('store-leads', {
      body: { leads, leadType },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const { data, error } = response;

    if (error) {
      console.error("Error storing leads:", error);
      throw new Error(error.message || "Failed to store leads. Please try again.");
    }

    if (!data || data.error) {
      console.error("Error in response from store-leads:", data?.error);
      throw new Error(data?.error || "Failed to store leads. Please try again.");
    }

    console.log("Successfully stored leads:", data);
    return data;
  } catch (error: any) {
    console.error("Error in storeImportedLeads:", error);
    throw error;
  }
}

/**
 * Utility functions for bulk lead operations
 */
export const bulkLeadUpdates = {
  /**
   * Update disposition for multiple leads at once
   * @param leadIds Array of lead IDs to update
   * @param disposition New disposition value
   * @returns Response with success status and data
   */
  async updateDisposition(leadIds: (number | string)[], disposition: string): Promise<BulkUpdateResponse> {
    try {
      if (leadIds.length === 0) {
        return { 
          success: false, 
          error: "No leads selected" 
        };
      }

      if (leadIds.length > 50) {
        return {
          success: false,
          error: "Maximum of 50 leads can be updated at once"
        };
      }
      
      console.log(`Bulk updating ${leadIds.length} leads to disposition: ${disposition}`);
      
      // Get the current auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Call the bulk-update-disposition edge function
      const { data, error } = await supabase.functions.invoke('bulk-update-disposition', {
        body: { 
          leadIds, 
          disposition 
        },
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : undefined
      });

      if (error) {
        console.error('Error during bulk update:', error);
        return { 
          success: false, 
          error: error.message || "Failed to update leads" 
        };
      }

      if (!data.success) {
        console.error('Error in function response:', data.error);
        return { 
          success: false, 
          error: data.error || "Failed to update leads" 
        };
      }

      console.log('Bulk update response:', data);
      return { 
        success: true, 
        data: data.data,
        message: data.message || `Successfully updated ${leadIds.length} leads` 
      };
    } catch (error: any) {
      console.error('Error in bulkLeadUpdates.updateDisposition:', error);
      return { 
        success: false, 
        error: error.message || "An unknown error occurred" 
      };
    }
  }
};
