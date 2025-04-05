
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

export interface ThoughtlyRemoteContact {
  id: string;
  name?: string;
  email?: string;
  phone_number: string;
  country_code?: string;
  attributes?: Record<string, any>;
  tags?: string[];
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
      // Convert search params to an object for the function
      const searchParams: Record<string, any> = params || {};
      
      // Invoke the new thoughtly-get-contacts edge function
      const { data, error } = await supabase.functions.invoke('thoughtly-get-contacts', {
        body: {
          searchParams: searchParams
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
   * Call a contact using Thoughtly's AI interviewer
   * @param contactId The ID of the contact to call
   * @param interviewId The ID of the interview/agent to use
   * @param metadata Optional metadata to include in the call
   * @returns The result of the call attempt
   */
  async callContact(contactId: string, interviewId: string, metadata?: Record<string, any>) {
    try {
      console.log(`Calling contact ${contactId} with interview ${interviewId}`);
      
      const { data, error } = await supabase.functions.invoke('thoughtly-call-contact', {
        body: {
          contact_id: contactId,
          interview_id: interviewId,
          ...(metadata && { metadata })
        }
      });

      if (error) {
        console.error('Error calling contact through Thoughtly:', error);
        throw error;
      }

      console.log('Call initiated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in callContact:', error);
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
  },

  /**
   * Map a Thoughtly remote contact to our local contact format
   */
  mapRemoteContactToLocal(contact: ThoughtlyRemoteContact): ThoughtlyContact {
    let firstName = '', lastName = '';
    if (contact.name) {
      const nameParts = contact.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Also check if firstName and lastName are in attributes
    if (contact.attributes?.firstName) {
      firstName = contact.attributes.firstName;
    }
    if (contact.attributes?.lastName) {
      lastName = contact.attributes.lastName;
    }

    return {
      id: contact.attributes?.id ? Number(contact.attributes.id) : Date.now(),
      firstName,
      lastName,
      email: contact.email || '',
      phone1: contact.phone_number || '',
      phone2: contact.attributes?.phone2 || '',
      disposition: contact.attributes?.disposition || 'Not Contacted',
      avatar: contact.attributes?.avatar || '',
      tags: contact.tags || [],
      countryCode: contact.country_code || 'US'
    };
  },
  
  /**
   * Start AI dialing session for a list of contacts
   * @param contactIds List of contact IDs to dial
   * @param interviewId The interview/agent ID to use for calling
   */
  async startAIDialingSession(contactIds: string[], interviewId: string) {
    try {
      console.log(`Starting AI dialing session for ${contactIds.length} contacts`);
      
      const results = {
        success: [] as any[],
        errors: [] as any[],
        total: contactIds.length
      };
      
      // Call each contact one by one
      for (let i = 0; i < contactIds.length; i++) {
        const contactId = contactIds[i];
        
        try {
          const callResult = await this.callContact(contactId, interviewId);
          
          results.success.push({
            contactId,
            callData: callResult
          });
          
          // Add a small delay between calls to avoid rate limiting
          if (i < contactIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error calling contact ${contactId}:`, error);
          
          results.errors.push({
            contactId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Error in startAIDialingSession:', error);
      throw error;
    }
  }
};
