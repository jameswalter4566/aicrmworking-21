import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const REDIRECT_URI = 'https://preview--aicrmworking.lovable.app/settings';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

serve(async (req) => {
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
    
    if (action === 'authorize') {
      console.log("Creating authorization URL");
      
      if (!CLIENT_ID) {
        console.error('Missing required environment variables for authorization');
        return new Response(
          JSON.stringify({ 
            error: 'Server configuration error', 
            details: 'Missing required OAuth configuration' 
          }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
      }
      
      console.log("Using redirect URI:", REDIRECT_URI);
      
      const scope = encodeURIComponent(
        'https://www.googleapis.com/auth/gmail.send ' +
        'https://www.googleapis.com/auth/gmail.readonly ' + 
        'https://www.googleapis.com/auth/userinfo.email'
      );
      
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
        { 
          headers: corsHeaders,
          status: 200
        }
      );
    }
    
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      console.log("Received callback with code:", code);
      
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'No authorization code provided' }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }

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
      console.log("Token data:", tokenData);
      
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

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      
      const userInfo = await userInfoResponse.json();
      const email = userInfo.email;
      console.log("User email:", email);
      
      // Here you would typically store the tokens and user info in your database
      // For simplicity, we're just returning the email
      return new Response(
        JSON.stringify({ success: true, email }),
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
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
