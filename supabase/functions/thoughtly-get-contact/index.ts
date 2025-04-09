
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Lead {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  mailingAddress?: string;
  propertyAddress?: string;
  stage?: string;
  assigned?: string;
  disposition?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

serve(async (req: Request) => {
  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the lead ID from the URL query parameter
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing lead ID parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Try to fetch the lead from the database
    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Database error:", error);
      
      // Return a formatted response for the frontend
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to retrieve lead data",
        data: null
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Map database fields to frontend expected fields
    const formattedLead: Lead = {
      id: lead.id,
      firstName: lead.first_name || "",
      lastName: lead.last_name || "",
      email: lead.email || "",
      phone1: lead.phone1 || "",
      phone2: lead.phone2 || "",
      mailingAddress: lead.mailing_address || "",
      propertyAddress: lead.property_address || "",
      disposition: lead.disposition || "Not Contacted",
      avatar: lead.avatar || "",
      assigned: lead.assigned_to || "",
      createdAt: lead.created_at || new Date().toISOString(),
      updatedAt: lead.updated_at || new Date().toISOString()
    };

    return new Response(JSON.stringify({ 
      success: true, 
      data: formattedLead 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: "An unexpected error occurred",
      data: null
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
