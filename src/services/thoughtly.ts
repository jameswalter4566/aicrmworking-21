
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
      console.log('Getting contacts from Thoughtly with params:', params);
      
      // Use the dedicated thoughtly-get-contacts edge function
      const { data, error } = await supabase.functions.invoke('thoughtly-get-contacts', {
        body: params || {}
      });

      if (error) {
        console.error('Error getting contacts from Thoughtly:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error getting contacts from Thoughtly:', data.error);
        throw new Error(data.error || 'Failed to get contacts from Thoughtly');
      }

      console.log('Retrieved contacts from Thoughtly:', data);
      return data.data || [];
    } catch (error) {
      console.error('Error in getContacts:', error);
      throw error;
    }
  },

  /**
   * Call contacts using Thoughtly AI
   * @param contacts Array of contact IDs to call
   * @param interviewId ID of the interview/agent to use
   * @param metadata Additional metadata for the call
   * @returns Summary of call attempts
   */
  async callContacts(contacts: string[] | any[], interviewId: string = "ctAaNCdh", metadata: Record<string, any> = {}) {
    try {
      console.log(`Calling ${contacts.length} contacts with interview ID: ${interviewId}`);
      
      // Ensure contacts have proper format with contact_id
      const formattedContacts = contacts.map(contact => {
        // If it's just a string ID, format it properly
        if (typeof contact === 'string') {
          return { id: contact };
        }
        
        // If it's an object with an ID, ensure it has the expected format
        if (typeof contact === 'object' && contact !== null) {
          // If it doesn't have an id property but has a contact_id, use that
          if (!contact.id && contact.contact_id) {
            return contact;
          }
          // Otherwise, use the id property
          return contact;
        }
        
        return contact;
      });
      
      // Convert all metadata values to strings (API requirement)
      const stringifiedMetadata = Object.entries(metadata || {}).reduce((acc, [key, value]) => {
        acc[key] = String(value); // Convert all values to strings
        return acc;
      }, {} as Record<string, string>);
      
      // Use the dedicated thoughtly-call-contacts edge function
      const { data, error } = await supabase.functions.invoke('thoughtly-call-contacts', {
        body: {
          contacts: formattedContacts,
          interview_id: interviewId,
          metadata: stringifiedMetadata
        }
      });

      if (error) {
        console.error('Error calling contacts through Thoughtly:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error calling contacts through Thoughtly:', data.error);
        throw new Error(data.error || 'Failed to call contacts through Thoughtly');
      }

      console.log('Call results from Thoughtly:', data);
      return data;
    } catch (error) {
      console.error('Error in callContacts:', error);
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
