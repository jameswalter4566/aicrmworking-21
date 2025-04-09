
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
  notes?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
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
   * Retrieve leads from Supabase via the retrieve-leads edge function with pagination
   * @param paginationParams Pagination parameters (page and limit)
   * @returns Paginated array of leads from all sources
   */
  async retrieveLeads(paginationParams: PaginationParams = { page: 1, limit: 10 }): Promise<PaginatedResult<ThoughtlyContact>> {
    try {
      console.log('Retrieving leads from Supabase with pagination:', paginationParams);
      
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
      
      console.log('Calling retrieve-leads edge function with pagination...');
      let response;
      
      try {
        // First try - use auth token if available
        response = await supabase.functions.invoke('retrieve-leads', {
          body: { 
            source: 'all',
            page: paginationParams.page || 1,
            limit: paginationParams.limit || 10
          },
          headers
        });
      } catch (initialError) {
        console.error('First attempt failed, trying fallback approach:', initialError);
        
        // Fallback - try without headers to see if it's an auth issue
        response = await supabase.functions.invoke('retrieve-leads', {
          body: { 
            source: 'all',
            page: paginationParams.page || 1,
            limit: paginationParams.limit || 10
          }
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
      
      // Check if data array exists and is populated
      if (data.data && Array.isArray(data.data)) {
        console.log(`Retrieved ${data.data.length} leads from edge function`);
        return {
          data: data.data,
          totalCount: data.metadata?.totalLeadCount || 0,
          page: data.metadata?.currentPage || 1,
          limit: data.metadata?.limit || 10,
          totalPages: data.metadata?.totalPages || 1
        };
      } else {
        console.warn('No leads found in response data array');
        return {
          data: [],
          totalCount: 0,
          page: paginationParams.page || 1,
          limit: paginationParams.limit || 10,
          totalPages: 0
        };
      }
    } catch (error) {
      console.error('Error in retrieveLeads:', error);
      throw error;
    }
  }
};
