
// Supabase Edge Function to generate SMS campaign CSV and send as email
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Send email with CSV attachment
    const { data, error } = await supabase.auth.admin.sendEmailWithAttachment({
      to: 'zoomcallcoin@gmail.com',
      subject: `SMS Campaign: ${campaignName || 'New Campaign'}`,
      body: `
        <h2>SMS Campaign Details</h2>
        <p><strong>Campaign Name:</strong> ${campaignName || 'Unnamed Campaign'}</p>
        <p><strong>Contacts:</strong> ${contacts.length}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p>Please find attached the CSV file with all contact details for this SMS campaign.</p>
      `,
      template: 'sms-campaign',
      template_data: {
        campaign: campaignName || 'New Campaign',
        contacts_count: contacts.length,
        message: message
      },
      attachments: [
        {
          content: btoa(csvContent),
          filename: filename,
          type: 'text/csv',
        }
      ]
    })

    if (error) {
      throw new Error(`Error sending email: ${error.message}`)
    }

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
