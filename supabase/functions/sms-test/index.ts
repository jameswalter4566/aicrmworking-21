
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("SMS Test function invoked");
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { phoneNumber, message } = await req.json();
    
    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phone number is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const testMessage = message || "This is a test message from the SMS Gateway API";
    
    console.log(`Sending test SMS to ${phoneNumber}: "${testMessage}"`);
    
    // Call our SMS send function directly
    try {
      const { data, error } = await supabase.functions.invoke('sms-send-single', {
        body: { 
          phoneNumber, 
          message: testMessage,
          prioritize: true 
        }
      });
      
      if (error) {
        throw error;
      }
      
      console.log("SMS test response:", JSON.stringify(data));
      
      if (!data.success) {
        throw new Error(data.error || "SMS sending failed");
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Test SMS sent successfully",
          response: data
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (invokeError) {
      console.error("Error invoking SMS function:", invokeError);
      throw new Error(`SMS function error: ${invokeError.message}`);
    }
  } catch (error) {
    console.error("Error in SMS test function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
