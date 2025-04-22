
import { supabase } from "@/integrations/supabase/client";

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
    console.log("Making authenticated request to store-leads with token");
    
    // Call the Supabase Edge Function with the auth token
    const { data, error } = await supabase.functions.invoke('store-leads', {
      body: { leads, leadType },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (error) {
      console.error("Error storing leads:", error);
      throw new Error(error.message || "Failed to store leads. Please try again.");
    }

    console.log("Successfully stored leads:", data);
    return data;
  } catch (error: any) {
    console.error("Error in storeImportedLeads:", error);
    throw error;
  }
}
