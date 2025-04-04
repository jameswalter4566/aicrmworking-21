
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
}

export const thoughtlyService = {
  /**
   * Create a single contact in Thoughtly
   * @param contact The contact data to create
   * @returns The created contact data
   */
  async createContact(contact: ThoughtlyContact) {
    try {
      const { data, error } = await supabase.functions.invoke('thoughtly-contacts', {
        body: {
          action: 'createContact',
          contacts: contact
        }
      });

      if (error) {
        console.error('Error creating Thoughtly contact:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createContact:', error);
      throw error;
    }
  },

  /**
   * Create multiple contacts in Thoughtly
   * @param contacts Array of contacts to create
   * @returns Summary of successful and failed imports
   */
  async createBulkContacts(contacts: ThoughtlyContact[]) {
    try {
      const { data, error } = await supabase.functions.invoke('thoughtly-contacts', {
        body: {
          action: 'createContact',
          contacts
        }
      });

      if (error) {
        console.error('Error creating bulk Thoughtly contacts:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createBulkContacts:', error);
      throw error;
    }
  },

  /**
   * Get contacts from Thoughtly
   * @param params Optional search parameters
   * @returns Array of contacts from Thoughtly
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
      // Convert params to URLSearchParams if provided
      const urlParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            if (Array.isArray(value)) {
              // Handle arrays like tags
              value.forEach(item => urlParams.append(key, item));
            } else {
              urlParams.append(key, String(value));
            }
          }
        });
      }

      // Build the querystring
      const queryString = urlParams.toString() 
        ? `?${urlParams.toString()}`
        : '';

      const { data, error } = await supabase.functions.invoke(`thoughtly-contacts${queryString}`, {
        method: 'GET'
      });

      if (error) {
        console.error('Error fetching Thoughtly contacts:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getContacts:', error);
      throw error;
    }
  }
};
