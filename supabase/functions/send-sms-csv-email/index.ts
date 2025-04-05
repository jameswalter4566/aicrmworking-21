
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

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

    // Encode the CSV content to base64
    const encoder = new TextEncoder()
    const csvData = encoder.encode(csvContent)
    const base64CSV = btoa(String.fromCharCode(...csvData))

    // Prepare email content for SendGrid
    const emailData = {
      personalizations: [
        {
          to: [
            { email: "jameswalter@goldenpathwayfinancial.com" },
            { email: "daniel@pacificcreditsolutions.com" }
          ]
        }
      ],
      from: { email: "updates@homeagentaiupdates.com", name: "SMS Campaign" },
      subject: `SMS Campaign: ${campaignName || 'New Campaign'}`,
      content: [
        {
          type: "text/html",
          value: `
            <h2>SMS Campaign Details</h2>
            <p><strong>Campaign Name:</strong> ${campaignName || 'Unnamed Campaign'}</p>
            <p><strong>Contacts:</strong> ${contacts.length}</p>
            <p><strong>Message:</strong> ${message}</p>
            <p>Please find attached the CSV file with all contact details for this SMS campaign.</p>
          `
        }
      ],
      attachments: [
        {
          content: base64CSV,
          filename: filename,
          type: "text/csv",
          disposition: "attachment"
        }
      ]
    };

    // Send email using SendGrid API
    const response = await fetch(SENDGRID_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SENDGRID_API_KEY}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid API error:', response.status, errorText);
      throw new Error(`SendGrid API error: ${response.status} ${errorText}`);
    }

    console.log('Email sent successfully with SendGrid');

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully with SendGrid',
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
