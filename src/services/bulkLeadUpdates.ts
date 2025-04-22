
import { supabase } from "@/integrations/supabase/client";

export interface BulkUpdateResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export const bulkLeadUpdates = {
  /**
   * Update disposition for multiple leads at once
   * @param leadIds Array of lead IDs to update
   * @param disposition New disposition value
   * @returns Response with success status and data
   */
  async updateDisposition(leadIds: (number | string)[], disposition: string): Promise<BulkUpdateResponse> {
    try {
      if (leadIds.length === 0) {
        return { 
          success: false, 
          error: "No leads selected" 
        };
      }

      if (leadIds.length > 50) {
        return {
          success: false,
          error: "Maximum of 50 leads can be updated at once"
        };
      }
      
      console.log(`Bulk updating ${leadIds.length} leads to disposition: ${disposition}`);
      
      // Call the bulk-update-disposition edge function
      const { data, error } = await supabase.functions.invoke('bulk-update-disposition', {
        body: { 
          leadIds, 
          disposition 
        }
      });

      if (error) {
        console.error('Error during bulk update:', error);
        return { 
          success: false, 
          error: error.message || "Failed to update leads" 
        };
      }

      if (!data.success) {
        console.error('Error in function response:', data.error);
        return { 
          success: false, 
          error: data.error || "Failed to update leads" 
        };
      }

      console.log('Bulk update response:', data);
      return { 
        success: true, 
        data: data.data,
        message: data.message || `Successfully updated ${leadIds.length} leads` 
      };
    } catch (error: any) {
      console.error('Error in bulkLeadUpdates.updateDisposition:', error);
      return { 
        success: false, 
        error: error.message || "An unknown error occurred" 
      };
    }
  }
};
