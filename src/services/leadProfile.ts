
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
  id: number;
  leadId: number;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface LeadActivity {
  id: number;
  leadId: number;
  type: string;
  description: string;
  timestamp: string;
}

export const leadProfileService = {
  /**
   * Get a single lead by ID
   * @param leadId The ID of the lead to retrieve
   * @returns Lead profile data
   */
  async getLeadById(leadId: number | string): Promise<LeadProfile> {
    try {
      console.log('Fetching lead with ID:', leadId);
      
      // Call the lead-profile edge function
      const { data, error } = await supabase.functions.invoke('lead-profile', {
        params: { id: leadId }
      });

      if (error) {
        console.error('Error fetching lead:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error in response:', data.error);
        throw new Error(data.error || 'Failed to fetch lead');
      }

      console.log('Retrieved lead:', data);
      return data.data;
    } catch (error) {
      console.error('Error in getLeadById:', error);
      throw error;
    }
  },

  /**
   * Mock function to simulate getting lead notes
   * In a real application, this would call a backend API
   * @param leadId The ID of the lead
   */
  async getLeadNotes(leadId: number | string): Promise<LeadNote[]> {
    // For now, we'll return mock data
    // In a production app, this would fetch from a real API endpoint
    return [
      {
        id: 1,
        leadId: Number(leadId),
        content: "Initial contact made. Lead expressed interest in property listings in the downtown area.",
        createdBy: "Agent 1",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        leadId: Number(leadId),
        content: "Followed up with email about new listings. Awaiting response.",
        createdBy: "Agent 1",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        leadId: Number(leadId),
        content: "Lead requested more information about financing options.",
        createdBy: "Agent 2",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  },

  /**
   * Mock function to simulate getting lead activities
   * In a real application, this would call a backend API
   * @param leadId The ID of the lead
   */
  async getLeadActivities(leadId: number | string): Promise<LeadActivity[]> {
    // Mock data for now
    return [
      {
        id: 1,
        leadId: Number(leadId),
        type: "Email",
        description: "Sent welcome email with property listings",
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        leadId: Number(leadId),
        type: "Call",
        description: "Outbound call - discussed preferences",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        leadId: Number(leadId),
        type: "Email",
        description: "Lead opened listing email",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        leadId: Number(leadId),
        type: "Text",
        description: "Sent appointment reminder",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 5,
        leadId: Number(leadId),
        type: "Meeting",
        description: "Property showing",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  },

  /**
   * Add a note to a lead
   * @param leadId The ID of the lead 
   * @param content The note content
   */
  async addNote(leadId: number | string, content: string): Promise<LeadNote> {
    // In a real application, this would save to a database
    // For now, we'll just return a mock response
    const newNote = {
      id: Math.floor(Math.random() * 10000),
      leadId: Number(leadId),
      content,
      createdBy: "Current User",
      createdAt: new Date().toISOString()
    };
    
    console.log('Added note:', newNote);
    return newNote;
  }
};
