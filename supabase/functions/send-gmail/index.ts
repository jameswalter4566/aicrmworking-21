
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Create a supabase client with the anon key for auth verification
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create a supabase admin client with the service role key for bypassing RLS
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: authError }),
        { 
          status: 401, 
          headers: corsHeaders 
        }
      );
    }

    // Retrieve the user's Google email connection
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No Google email connection found' }),
        { 
          status: 404, 
          headers: corsHeaders 
        }
      );
    }

    // Parse the request body
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required email fields' }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    // Send email via Gmail API
    const emailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: btoa(`To: ${to}\nSubject: ${subject}\n\n${body}`)
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Gmail API error:', emailResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email via Gmail', 
          details: errorText 
        }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }

    const result = await emailResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id 
      }),
      { 
        headers: corsHeaders 
      }
    );

  } catch (error) {
    console.error('Error in send-gmail function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
