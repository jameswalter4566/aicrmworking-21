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
  avatar?: string;
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
   * Create a single contact in Thoughtly
   * @param contact The contact data to create
   * @returns The created contact data
   */
  async createContact(contact: ThoughtlyContact) {
    try {
      console.log('Creating contact in Thoughtly:', contact);
      
      // Send the contact directly to the thoughtly-contacts edge function
      const { data, error } = await supabase.functions.invoke('thoughtly-contacts', {
        body: {
          action: 'createContact',
          contacts: contact
        }
      });

      if (error) {
        console.error('Error creating contact in Thoughtly:', error);
        throw error;
      }

      console.log('Contact created successfully in Thoughtly:', data);
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
      console.log(`Creating ${contacts.length} contacts in Thoughtly`);
      
      // Send the contacts directly to the thoughtly-contacts edge function
      const { data, error } = await supabase.functions.invoke('thoughtly-contacts', {
        body: {
          action: 'createContact',
          contacts: contacts
        }
      });

      if (error) {
        console.error('Error creating bulk contacts in Thoughtly:', error);
        throw error;
      }

      console.log('Bulk contacts created successfully in Thoughtly:', data);
      return data;
    } catch (error) {
      console.error('Error in createBulkContacts:', error);
      throw error;
    }
  },

  /**
   * Get contacts from Thoughtly API
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
      // Convert search params to a URLSearchParams object
      const searchParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            if (Array.isArray(value)) {
              value.forEach(item => searchParams.append(key, String(item)));
            } else {
              searchParams.append(key, String(value));
            }
          }
        });
      }
      
      // Modify the function invoke to pass search parameters in the body
      const { data, error } = await supabase.functions.invoke('thoughtly-contacts', {
        body: {
          action: 'getContacts',
          searchParams: searchParams.toString()
        }
      });

      if (error) {
        console.error('Error getting contacts from Thoughtly:', error);
        throw error;
      }

      console.log('Retrieved contacts from Thoughtly:', data);
      return data.data || [];
    } catch (error) {
      console.error('Error in getContacts:', error);
      throw error;
    }
  },

  /**
   * Sync local leads data with Thoughtly contacts
   * @param leads Local leads data to sync
   * @returns Array of synced leads
   */
  async syncLeads(leads: ThoughtlyContact[]) {
    try {
      // Import the leads to Thoughtly using the bulk contacts method
      const result = await this.createBulkContacts(leads);
      
      // Retrieve the updated list of contacts from Thoughtly
      const updatedContacts = await this.getContacts();
      
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
