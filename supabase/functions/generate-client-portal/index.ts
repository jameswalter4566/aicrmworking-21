
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

// Generate a random slug for the portal URL
function generateSlug(length = 8): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Generate a secure access token for authentication
function generateAccessToken(length = 32): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get request data
    const { leadId, createdBy } = await req.json()

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'Lead ID is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Check if the lead exists
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('id, first_name, last_name')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Check if a portal already exists for this lead
    const { data: existingPortal } = await supabaseClient
      .from('client_portal_access')
      .select('*')
      .eq('lead_id', leadId)
      .single()

    if (existingPortal) {
      // Update the created_by field if it's not set and we have a creator now
      if (createdBy && !existingPortal.created_by) {
        await supabaseClient
          .from('client_portal_access')
          .update({ created_by: createdBy })
          .eq('id', existingPortal.id)
      }
      
      // Return the existing portal info - modified to be consistent with new URL format
      return new Response(
        JSON.stringify({ 
          portal: existingPortal,
          url: `/client-portal/${existingPortal.portal_slug}?token=${existingPortal.access_token}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Generate new portal access
    const portalSlug = generateSlug(10)
    const accessToken = generateAccessToken()

    // Store in the database with creator information
    const { data: newPortal, error: portalError } = await supabaseClient
      .from('client_portal_access')
      .insert({
        lead_id: leadId,
        portal_slug: portalSlug,
        access_token: accessToken,
        created_by: createdBy || null
      })
      .select()
      .single()

    if (portalError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create portal access' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    return new Response(
      JSON.stringify({
        portal: newPortal,
        url: `/client-portal/${portalSlug}?token=${accessToken}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
