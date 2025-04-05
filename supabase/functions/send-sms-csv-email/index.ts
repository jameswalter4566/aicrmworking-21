
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
serve(async (req) => {
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

    // Use TextEncoder to convert string to Uint8Array for the attachment
    const encoder = new TextEncoder()
    const csvData = encoder.encode(csvContent)
    
    // Base64 encode the Uint8Array
    const base64CSV = btoa(String.fromCharCode(...csvData))

    // Send email with CSV attachment using Resend
    const emailResponse = await resend.emails.send({
      from: 'SMSCampaign <onboarding@resend.dev>',
      to: ['jameswalter@goldenpathwayfinancial.com'],
      cc: ['daniel@pacificcreditsolutions.com'],
      subject: `SMS Campaign: ${campaignName || 'New Campaign'}`,
      html: `
        <h2>SMS Campaign Details</h2>
        <p><strong>Campaign Name:</strong> ${campaignName || 'Unnamed Campaign'}</p>
        <p><strong>Contacts:</strong> ${contacts.length}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p>Please find attached the CSV file with all contact details for this SMS campaign.</p>
      `,
      attachments: [
        {
          filename: filename,
          content: base64CSV,
          type: 'text/csv',
        },
      ],
    });

    console.log('Email sent successfully:', emailResponse);

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
