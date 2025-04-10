
import { supabase } from "@/integrations/supabase/client";

export interface MortgageDeal {
  id: string;
  lead_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone1?: string;
  phone2?: string;
  mailing_address?: string;
  property_address?: string;
  disposition?: string;
  mortgage_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  stage: string;
  value?: number;
  probability: number;
  closing_date?: string;
}

export const mortgageDealService = {
  /**
   * Push a lead to the mortgage pipeline
   */
  async pushToPipeline(leadId: number): Promise<MortgageDeal> {
    try {
      console.log(`Pushing lead ${leadId} to pipeline`);
      
      const { data, error } = await supabase.functions.invoke('store-mortgage-deal', {
        body: { leadId }
      });

      if (error) {
        console.error('Error pushing to pipeline:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error in response:', data.error);
        throw new Error(data.error || 'Failed to push to pipeline');
      }

      console.log('Successfully pushed to pipeline:', data.data);
      return data.data;
    } catch (error) {
      console.error('Error in pushToPipeline:', error);
      throw error;
    }
  },

  /**
   * Get all mortgage deals
   */
  async getAllDeals(stage?: string): Promise<MortgageDeal[]> {
    try {
      console.log('Fetching all mortgage deals');
      
      let url = 'retrieve-mortgage-deals';
      if (stage) {
        url += `?stage=${encodeURIComponent(stage)}`;
      }
      
      const { data, error } = await supabase.functions.invoke(url);

      if (error) {
        console.error('Error fetching mortgage deals:', error);
        throw error;
      }

      if (!data.success) {
        console.error('Error in response:', data.error);
        throw new Error(data.error || 'Failed to fetch mortgage deals');
      }

      return data.data;
    } catch (error) {
      console.error('Error in getAllDeals:', error);
      throw error;
    }
  }
};
