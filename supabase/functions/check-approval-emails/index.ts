
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();
    console.log("Checking emails for lead:", leadId);

    // Get all user email connections to check
    const { data: connections, error: connError } = await supabaseAdmin
      .from('user_email_connections')
      .select('*')
      .eq('provider', 'google');

    if (connError || !connections?.length) {
      console.error("Error getting email connections:", connError);
      throw new Error("No email connections found");
    }

    const results = [];

    for (const connection of connections) {
      try {
        // Refresh token if needed
        if (new Date(connection.expires_at) < new Date()) {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
              client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
              refresh_token: connection.refresh_token,
              grant_type: 'refresh_token',
            }),
          });

          if (!tokenResponse.ok) {
            console.error("Token refresh failed for user:", connection.user_id);
            continue;
          }

          const tokenData = await tokenResponse.json();
          connection.access_token = tokenData.access_token;
          
          await supabaseAdmin
            .from('user_email_connections')
            .update({
              access_token: tokenData.access_token,
              expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            })
            .eq('id', connection.id);
        }

        // Search for new emails with attachments
        const searchResponse = await fetch(
          'https://www.googleapis.com/gmail/v1/users/me/messages?q=has:attachment',
          {
            headers: {
              'Authorization': `Bearer ${connection.access_token}`
            }
          }
        );

        if (!searchResponse.ok) {
          console.error("Gmail API error for user:", connection.user_id);
          continue;
        }

        const searchData = await searchResponse.json();
        const messageIds = searchData.messages || [];

        for (const message of messageIds) {
          // Check if we've already processed this email
          const { data: existingProcessed } = await supabaseAdmin
            .from('processed_gmail_attachments')
            .select('*')
            .eq('email_id', message.id)
            .single();

          if (existingProcessed) {
            console.log("Email already processed:", message.id);
            continue;
          }

          // Get email details
          const messageResponse = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
            {
              headers: {
                'Authorization': `Bearer ${connection.access_token}`
              }
            }
          );

          if (!messageResponse.ok) continue;

          const messageData = await messageResponse.json();
          
          // Find PDF attachments
          const attachments = [];
          const findAttachments = (part) => {
            if (part.mimeType === "application/pdf" && part.body?.attachmentId) {
              attachments.push({
                filename: part.filename,
                attachmentId: part.body.attachmentId,
                mimeType: part.mimeType
              });
            }
            if (part.parts) {
              part.parts.forEach(subpart => findAttachments(subpart));
            }
          };

          if (messageData.payload.parts) {
            messageData.payload.parts.forEach(part => findAttachments(part));
          }

          // Process each PDF attachment
          for (const attachment of attachments) {
            const attachmentResponse = await fetch(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}/attachments/${attachment.attachmentId}`,
              {
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`
                }
              }
            );

            if (!attachmentResponse.ok) continue;

            const attachmentData = await attachmentResponse.json();
            if (!attachmentData.data) continue;

            // Convert to data URL
            const attachmentBase64 = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
            const downloadUrl = `data:application/pdf;base64,${attachmentBase64}`;

            // Analyze the PDF
            const { data: analysisData, error: analysisError } = await supabaseAdmin.functions.invoke('analyze-pdf-document', {
              body: { 
                fileUrl: downloadUrl,
                fileType: "conditions",
                leadId
              }
            });

            if (!analysisError && analysisData?.success) {
              // Record successful processing
              await supabaseAdmin
                .from('processed_gmail_attachments')
                .insert({
                  email_id: message.id,
                  attachment_id: attachment.attachmentId,
                  lead_id: leadId,
                  success: true
                });

              results.push({
                emailId: message.id,
                attachmentId: attachment.attachmentId,
                success: true
              });
            }
          }
        }
      } catch (error) {
        console.error("Error processing connection:", connection.user_id, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in check-approval-emails:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
