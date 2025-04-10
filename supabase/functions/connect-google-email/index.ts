
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const REDIRECT_URI = Deno.env.get('REDIRECT_URI') || 'https://imrmboyczebjlbnkgjns.lovableproject.com/settings';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json' // Always set JSON content type
};

// Create a single supabase client for interacting with your database
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

serve(async (req) => {
  console.log("Function invoked with URL:", req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204,
    });
  }
  
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    console.log("Requested action:", action);
    
    // Handle authorization url generation
    if (action === 'authorize') {
      console.log("Creating authorization URL");
      
      // Create a new auth URL for Google
      const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email');
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}` + 
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${scope}` +
        `&access_type=offline` +
        `&prompt=consent`;
        
      console.log("Generated auth URL (partial):", authUrl.substring(0, 100) + "...");
      
      return new Response(
        JSON.stringify({ url: authUrl }),
        { headers: corsHeaders }
      );
    }
    
    // Handle callback with auth code
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      console.log("Received callback with code present:", !!code);
      
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'No authorization code provided' }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }

      // Exchange the code for tokens
      console.log("Exchanging code for tokens");
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log("Token response status:", tokenResponse.status);
      
      if (tokenData.error) {
        console.error('Error exchanging code for tokens:', tokenData);
        return new Response(
          JSON.stringify({ error: 'Failed to exchange authorization code for tokens', details: tokenData.error }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }

      // Get user info to retrieve email address
      console.log("Getting user info");
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      
      const userInfo = await userInfoResponse.json();
      const email = userInfo.email;
      console.log("Retrieved user email:", email);
      
      // Get user ID from authorization header
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
      
      // Store the tokens in the database
      console.log("Storing tokens in database");
      const { data, error } = await supabase
        .from('user_email_connections')
        .upsert({
          user_id: user.id,
          provider: 'google',
          email: email,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          created_at: new Date().toISOString(),
        })
        .select();
      
      if (error) {
        console.error('Error storing tokens:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to store connection information', details: error }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, email }),
        { headers: corsHeaders }
      );
    }
    
    // Handle disconnecting an account
    if (action === 'disconnect') {
      const body = await req.json();
      const { provider } = body;
      console.log("Disconnecting provider:", provider);
      
      if (!provider) {
        return new Response(
          JSON.stringify({ error: 'Provider is required' }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }
      
      // Get user ID from authorization header
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
      
      // Get the connection to revoke
      console.log("Finding connection to revoke");
      const { data: connection } = await supabase
        .from('user_email_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .single();
      
      if (connection?.access_token) {
        try {
          // Revoke the token with Google
          console.log("Revoking token with Google");
          await fetch(`https://oauth2.googleapis.com/revoke?token=${connection.access_token}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
        } catch (error) {
          console.error('Error revoking token:', error);
          // Continue with deletion even if revocation fails
        }
      }
      
      // Delete the connection from the database
      console.log("Deleting connection from database");
      const { error } = await supabase
        .from('user_email_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);
      
      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to remove connection', details: error }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: corsHeaders }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: corsHeaders 
      }
    );
  } catch (error) {
    console.error('Error in connect-google-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
