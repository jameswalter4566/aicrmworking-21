
// Supabase Edge Function to generate SMS campaign CSV and send as email
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { SmtpClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { contacts, message, campaignName } = await req.json()

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid contacts are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate CSV content
    let csvContent = "First Name,Last Name,Phone Number\n"
    
    contacts.forEach(contact => {
      const firstName = (contact.firstName || contact.attributes?.firstName || '').replace(/,/g, ' ')
      const lastName = (contact.lastName || contact.attributes?.lastName || '').replace(/,/g, ' ')
      const phoneNumber = contact.phone_number || contact.phone1 || ''
      
      csvContent += `${firstName},${lastName},${phoneNumber}\n`
    })
    
    // Add the message as the last row with a separator
    csvContent += "\nMessage:\n"
    csvContent += message.replace(/,/g, ' ')

    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `sms_campaign_${campaignName ? campaignName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' : ''}${timestamp}.csv`

    // Create SMTP client using environment variables
    const client = new SmtpClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USERNAME") || "",
          password: Deno.env.get("SMTP_PASSWORD") || "",
        },
      },
    });

    // Connect to SMTP server
    await client.connect();

    // Send email with attachment
    await client.send({
      from: Deno.env.get("SMTP_USERNAME") || "",
      to: "zoomcallcoin@gmail.com",
      subject: `SMS Campaign: ${campaignName || 'New Campaign'}`,
      content: `
        <h2>SMS Campaign Details</h2>
        <p><strong>Campaign Name:</strong> ${campaignName || 'Unnamed Campaign'}</p>
        <p><strong>Contacts:</strong> ${contacts.length}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p>Please find attached the CSV file with all contact details for this SMS campaign.</p>
      `,
      html: `
        <h2>SMS Campaign Details</h2>
        <p><strong>Campaign Name:</strong> ${campaignName || 'Unnamed Campaign'}</p>
        <p><strong>Contacts:</strong> ${contacts.length}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p>Please find attached the CSV file with all contact details for this SMS campaign.</p>
      `,
      attachments: [
        {
          contentType: "text/csv",
          filename: filename,
          content: csvContent,
        },
      ],
    });

    // Disconnect from SMTP server
    await client.close();

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error sending CSV email:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
