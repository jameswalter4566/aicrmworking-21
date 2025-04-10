
import { supabase } from "@/integrations/supabase/client";

export interface LeadProfile {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  disposition?: string;
  avatar?: string;
  mailingAddress?: string;
  propertyAddress?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface LeadNote {
  id: string;
  lead_id: number;
  content: string;
  created_by: string;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: number;
  type: string;
  description: string;
  timestamp: string;
}

export const leadProfileService = {
  /**
   * Get a single lead by ID
   * @param leadId The ID of the lead to retrieve
   * @returns Lead profile data along with notes and activities
   */
  async getLeadById(leadId: number | string): Promise<LeadProfile> {
    try {
      console.log('Fetching lead with ID:', leadId);
      
      // Call the lead-profile edge function
      const { data, error } = await supabase.functions.invoke('lead-profile', {
        body: { id: leadId }
      });

      if (error) {
        console.error('Error fetching lead:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error in response:', data.error);
        throw new Error(data.error || 'Failed to fetch lead');
      }

      console.log('Retrieved lead data:', data);
      return data.data.lead;
    } catch (error) {
      console.error('Error in getLeadById:', error);
      throw error;
    }
  },

  /**
   * Get notes for a lead
   * @param leadId The ID of the lead
   */
  async getLeadNotes(leadId: number | string): Promise<LeadNote[]> {
    try {
      console.log('Fetching notes for lead ID:', leadId);
      
      const { data, error } = await supabase.functions.invoke('lead-profile', {
        body: { id: leadId }
      });

      if (error) {
        console.error('Error fetching lead notes:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error in response:', data.error);
        throw new Error(data.error || 'Failed to fetch lead notes');
      }

      return data.data.notes;
    } catch (error) {
      console.error('Error in getLeadNotes:', error);
      throw error;
    }
  },

  /**
   * Get activities for a lead
   * @param leadId The ID of the lead
   */
  async getLeadActivities(leadId: number | string): Promise<LeadActivity[]> {
    try {
      console.log('Fetching activities for lead ID:', leadId);
      
      const { data, error } = await supabase.functions.invoke('lead-profile', {
        body: { id: leadId }
      });

      if (error) {
        console.error('Error fetching lead activities:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error in response:', data.error);
        throw new Error(data.error || 'Failed to fetch lead activities');
      }

      return data.data.activities;
    } catch (error) {
      console.error('Error in getLeadActivities:', error);
      throw error;
    }
  },

  /**
   * Add a note to a lead
   * @param leadId The ID of the lead 
   * @param content The note content
   */
  async addNote(leadId: number | string, content: string): Promise<LeadNote> {
    try {
      console.log('Adding note to lead ID:', leadId);
      
      const { data, error } = await supabase.functions.invoke('add-lead-note', {
        body: { 
          leadId, 
          content,
          createdBy: "Current User" // In a real app, this should be the authenticated user
        }
      });

      if (error) {
        console.error('Error adding note:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error in response:', data.error);
        throw new Error(data.error || 'Failed to add note');
      }

      console.log('Note added successfully:', data.data);
      return data.data;
    } catch (error) {
      console.error('Error in addNote:', error);
      throw error;
    }
  }
};
