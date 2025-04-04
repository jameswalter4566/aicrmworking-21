
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
      // Store the contact using the store-leads edge function
      const { data, error } = await supabase.functions.invoke('store-leads', {
        body: {
          leads: [contact],
          leadType: 'single'
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
      // Store the contacts using the store-leads edge function
      const { data, error } = await supabase.functions.invoke('store-leads', {
        body: {
          leads: contacts,
          leadType: 'bulk'
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
  },

  /**
   * Sync local leads data with Thoughtly contacts
   * @param leads Local leads data to sync
   * @returns Array of synced leads
   */
  async syncLeads(leads: ThoughtlyContact[]) {
    try {
      // First get all contacts from Thoughtly
      const existingContacts = await this.getContacts({
        limit: 100 // Adjust as needed
      });
      
      // Create a map of existing contacts by ID for easy lookup
      const contactMap = new Map();
      if (existingContacts?.success && existingContacts?.data) {
        existingContacts.data.forEach(contact => {
          if (contact.attributes?.id) {
            contactMap.set(contact.attributes.id, contact);
          }
        });
      }

      // Filter out leads that already exist in Thoughtly
      const newLeads = leads.filter(lead => !contactMap.has(String(lead.id)));
      
      if (newLeads.length === 0) {
        // No new leads to add
        return {
          success: true,
          message: "All leads already exist in Thoughtly",
          data: existingContacts?.data || []
        };
      }

      // Add any new leads to Thoughtly using the store-leads function
      const result = await this.createBulkContacts(newLeads);
      
      // Return the updated list of contacts
      const updatedContacts = await this.getContacts({
        limit: 100 // Adjust as needed
      });
      
      return {
        success: true,
        imported: result,
        data: updatedContacts?.data || []
      };
    } catch (error) {
      console.error('Error syncing leads:', error);
      throw error;
    }
  },
  
  /**
   * Retrieve leads from all available sources via the retrieve-leads edge function
   * @returns Array of leads from all sources
   */
  async retrieveLeads() {
    try {
      console.log('Retrieving leads from all sources');
      
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
      
      // Map the retrieved leads to the expected format
      const mappedLeads = Array.isArray(data.data) 
        ? data.data.map((contact: any) => {
            let firstName = '', lastName = '';
            if (contact.name) {
              const nameParts = contact.name.split(' ');
              firstName = nameParts[0] || '';
              lastName = nameParts.slice(1).join(' ') || '';
            }

            return {
              id: contact.attributes?.id ? Number(contact.attributes.id) : Date.now(),
              firstName: contact.attributes?.firstName || firstName,
              lastName: contact.attributes?.lastName || lastName,
              email: contact.email || '',
              phone1: contact.phone_number || '',
              phone2: contact.attributes?.phone2 || '',
              disposition: contact.attributes?.disposition || 'Not Contacted',
              avatar: contact.attributes?.avatar || '',
              tags: contact.tags || [],
              countryCode: contact.country_code || 'US'
            } as ThoughtlyContact;
          })
        : [];
      
      console.log(`Retrieved and mapped ${mappedLeads.length} leads`);
      
      return mappedLeads;
    } catch (error) {
      console.error('Error in retrieveLeads:', error);
      throw error;
    }
  }
};
