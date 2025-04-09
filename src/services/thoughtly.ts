import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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
  createdBy?: string;
}

export interface ContactNote {
  id: string;
  content: string;
  createdAt: string;
  createdBy?: string;
}

export interface ContactActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  details?: Record<string, any>;
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
      
      // First, also store the contact in our local database to ensure persistence
      const { data: storedData, error: storeError } = await supabase.functions.invoke('store-leads', {
        body: {
          leads: [contact],
          leadType: "manual"
        }
      });
      
      if (storeError) {
        console.error('Error storing contact in local database:', storeError);
      } else {
        console.log('Contact stored in local database:', storedData);
      }
      
      // Then, send the contact to the thoughtly-contacts edge function
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
      
      // First, also store the contacts in our local database to ensure persistence
      const { data: storedData, error: storeError } = await supabase.functions.invoke('store-leads', {
        body: {
          leads: contacts,
          leadType: "bulk"
        }
      });
      
      if (storeError) {
        console.error('Error storing bulk contacts in local database:', storeError);
      } else {
        console.log('Bulk contacts stored in local database:', storedData);
      }
      
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
  async callContacts(contacts: any[], interviewId: string = "ctAaNCdh", metadata: Record<string, any> = {}) {
    try {
      console.log(`Calling ${contacts.length} contacts with interview ID: ${interviewId}`);
      console.log('Contact data:', JSON.stringify(contacts));
      
      // No need to format contacts, just ensure we have a non-empty array
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        console.error('No contacts provided for calling');
        throw new Error('No contacts to call');
      }
      
      // Convert all metadata values to strings (API requirement)
      const stringifiedMetadata = Object.entries(metadata || {}).reduce((acc, [key, value]) => {
        acc[key] = String(value); // Convert all values to strings
        return acc;
      }, {} as Record<string, string>);
      
      // Use the dedicated thoughtly-call-contacts edge function
      const { data, error } = await supabase.functions.invoke('thoughtly-call-contacts', {
        body: {
          contacts: contacts,
          interview_id: interviewId,
          metadata: stringifiedMetadata
        }
      });

      if (error) {
        console.error('Error calling contacts through Thoughtly:', error);
        throw error;
      }

      console.log('Call results from Thoughtly:', data);
      
      if (!data.success) {
        console.error('Error calling contacts through Thoughtly:', data.error);
        throw new Error(data.error || 'Failed to call contacts through Thoughtly');
      }

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
   * Delete a contact from Thoughtly
   * @param contactId The ID of the contact to delete
   * @returns Summary of deletion operation
   */
  async deleteContact(contactId: number | string) {
    try {
      console.log('Deleting contact from Thoughtly:', contactId);
      
      // Send the delete request to the thoughtly-contacts edge function
      const { data, error } = await supabase.functions.invoke('thoughtly-contacts', {
        body: {
          action: 'deleteContact',
          contactId: contactId
        }
      });

      if (error) {
        console.error('Error deleting contact from Thoughtly:', error);
        throw error;
      }

      console.log('Contact deleted successfully from Thoughtly:', data);
      return data;
    } catch (error) {
      console.error('Error in deleteContact:', error);
      throw error;
    }
  },
  
  /**
   * Retrieve leads from Supabase via the retrieve-leads edge function
   * @param options Optional pagination parameters
   * @returns Array of leads with pagination data
   */
  async retrieveLeads(options?: {
    page?: number;
    limit?: number;
    source?: string;
  }) {
    try {
      console.log('Retrieving leads from Supabase with options:', options);
      
      // Get authentication session
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      
      // Setup headers for authentication if token exists
      let headers = {};
      if (authToken) {
        console.log('Auth token found, adding to request headers');
        headers = {
          Authorization: `Bearer ${authToken}`
        };
      } else {
        console.log('No auth token found, request will be anonymous');
      }
      
      // Add pagination parameters to request body
      const requestBody = {
        source: options?.source || 'all',
        page: options?.page || 1,
        limit: options?.limit || 10
      };
      
      console.log('Calling retrieve-leads edge function...', requestBody);
      let response;
      
      try {
        // First try - use auth token if available
        response = await supabase.functions.invoke('retrieve-leads', {
          body: requestBody,
          headers
        });
      } catch (initialError) {
        console.error('First attempt failed, trying fallback approach:', initialError);
        
        // Fallback - try without headers to see if it's an auth issue
        response = await supabase.functions.invoke('retrieve-leads', {
          body: requestBody
        });
      }
      
      const { data, error } = response;

      if (error) {
        console.error('Error retrieving leads from edge function:', error);
        throw error;
      }

      console.log('Response from retrieve-leads:', data);
      
      if (!data.success) {
        console.error('Error in response from retrieve-leads:', data.error);
        throw new Error(data.error || 'Failed to retrieve leads');
      }
      
      // Return the data along with pagination information
      return {
        data: data.data || [],
        totalCount: data.metadata?.totalLeadCount || 0,
        currentPage: options?.page || 1,
        totalPages: data.metadata?.totalPages || 1,
        pageSize: options?.limit || 10
      };
    } catch (error) {
      console.error('Error in retrieveLeads:', error);
      throw error;
    }
  },

  /**
   * Get a single contact by ID
   * @param id The contact ID to retrieve
   * @returns The contact data
   */
  async getContactById(id: number | string) {
    try {
      console.log('Getting contact from Thoughtly by ID:', id);
      
      const { data, error } = await supabase.functions.invoke('thoughtly-get-contact', {
        body: { id }
      });

      if (error) {
        console.error('Error getting contact from Thoughtly:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error getting contact from Thoughtly:', data.error);
        throw new Error(data.error || 'Failed to get contact from Thoughtly');
      }

      console.log('Retrieved contact from Thoughtly:', data);
      return data || {};
    } catch (error) {
      console.error('Error in getContactById:', error);
      throw error;
    }
  },

  /**
   * Get contact notes by contact ID
   * @param contactId The ID of the contact to get notes for
   * @returns Array of notes for the contact
   */
  async getContactNotes(contactId: number | string) {
    try {
      // In a real implementation, we would call an API endpoint
      // For now, we'll return mock data
      return [
        {
          id: '1',
          content: 'Initial contact made via phone. Lead expressed interest in property listings in downtown area.',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdBy: 'James Walker'
        },
        {
          id: '2',
          content: 'Follow-up email sent with listings matching their criteria.',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          createdBy: 'James Walker'
        },
        {
          id: '3',
          content: 'Scheduled a viewing for next Tuesday at 2 PM.',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          createdBy: 'James Walker'
        }
      ] as ContactNote[];
    } catch (error) {
      console.error('Error getting contact notes:', error);
      return [];
    }
  },

  /**
   * Get contact activity by contact ID
   * @param contactId The ID of the contact to get activity for
   * @returns Array of activity items for the contact
   */
  async getContactActivity(contactId: number | string) {
    try {
      // In a real implementation, we would call an API endpoint
      // For now, we'll return mock data
      return [
        {
          id: '1',
          type: 'email',
          description: 'Sent welcome email',
          timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          details: { subject: 'Welcome to our service!' }
        },
        {
          id: '2',
          type: 'phone',
          description: 'Outbound call',
          timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          details: { duration: '4:32', outcome: 'Answered' }
        },
        {
          id: '3',
          type: 'form',
          description: 'Filled out interest form',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          type: 'phone',
          description: 'Inbound call',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          details: { duration: '6:15', outcome: 'Answered' }
        },
        {
          id: '5',
          type: 'email',
          description: 'Follow-up email',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          details: { subject: 'Following up on our conversation' }
        }
      ] as ContactActivity[];
    } catch (error) {
      console.error('Error getting contact activity:', error);
      return [];
    }
  },
  
  /**
   * Add a note to a contact
   * @param contactId The ID of the contact to add a note to
   * @param content The content of the note
   * @returns The created note
   */
  async addContactNote(contactId: number | string, content: string) {
    try {
      // In a real implementation, we would call an API endpoint
      // For now, we'll return mock data
      return {
        id: Date.now().toString(),
        content,
        createdAt: new Date().toISOString(),
        createdBy: 'Current User'
      } as ContactNote;
    } catch (error) {
      console.error('Error adding contact note:', error);
      throw error;
    }
  }
};
