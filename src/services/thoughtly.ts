
import { supabase } from "@/integrations/supabase/client";

export interface ThoughtlyContact {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  disposition?: string;
  attributes?: Record<string, any>;
  tags?: string[];
  countryCode?: string;
  avatar?: string;  // Avatar property is now included in the interface
  mailingAddress?: string;
  propertyAddress?: string;
}

// Utility function to strip phone number of all non-numeric characters
function stripPhoneNumber(phoneNumber?: string): string {
  if (!phoneNumber) return "";
  return phoneNumber.replace(/\D/g, '');
}

export const thoughtlyService = {
  /**
   * Create a single contact in Supabase
   * @param contact The contact data to create
   * @returns The created contact data
   */
  async createContact(contact: ThoughtlyContact) {
    try {
      // Store the contact using the store-leads edge function
      const { data, error } = await supabase.functions.invoke('store-leads', {
        body: {
          leads: [contact],
          leadType: 'single'
        }
      });

      if (error) {
        console.error('Error creating contact:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createContact:', error);
      throw error;
    }
  },

  /**
   * Create multiple contacts in Supabase
   * @param contacts Array of contacts to create
   * @returns Summary of successful and failed imports
   */
  async createBulkContacts(contacts: ThoughtlyContact[]) {
    try {
      // Store the contacts using the store-leads edge function
      const { data, error } = await supabase.functions.invoke('store-leads', {
        body: {
          leads: contacts,
          leadType: 'bulk'
        }
      });

      if (error) {
        console.error('Error creating bulk contacts:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createBulkContacts:', error);
      throw error;
    }
  },

  /**
   * Get contacts from Supabase
   * @param params Optional search parameters
   * @returns Array of contacts from Supabase
   */
  async getContacts(params?: {
    search?: string;
    phone_numbers_only?: boolean;
    tags?: string[];
    excluded_tags?: string[];
    sort?: string;
    sortDirection?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    try {
      // We'll implement this via retrieve-leads instead
      return this.retrieveLeads();
    } catch (error) {
      console.error('Error in getContacts:', error);
      throw error;
    }
  },

  /**
   * Sync local leads data with Supabase contacts
   * @param leads Local leads data to sync
   * @returns Array of synced leads
   */
  async syncLeads(leads: ThoughtlyContact[]) {
    try {
      // Store all leads using bulk contacts
      const result = await this.createBulkContacts(leads);
      
      // Return the updated list of contacts
      const updatedContacts = await this.retrieveLeads();
      
      return {
        success: true,
        imported: result,
        data: updatedContacts || []
      };
    } catch (error) {
      console.error('Error syncing leads:', error);
      throw error;
    }
  },
  
  /**
   * Retrieve leads from Supabase via the retrieve-leads edge function
   * @returns Array of leads from all sources
   */
  async retrieveLeads() {
    try {
      console.log('Retrieving leads from Supabase');
      
      const { data, error } = await supabase.functions.invoke('retrieve-leads', {
        body: { source: 'all' }
      });

      if (error) {
        console.error('Error retrieving leads:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error retrieving leads:', data.error);
        throw new Error(data.error || 'Failed to retrieve leads');
      }
      
      // Return the leads as they come from our retrieve function
      return data.data || [];
    } catch (error) {
      console.error('Error in retrieveLeads:', error);
      throw error;
    }
  }
};
