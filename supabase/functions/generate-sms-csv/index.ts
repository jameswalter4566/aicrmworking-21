
// Supabase Edge Function to generate SMS campaign CSV
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
    const { contacts, message } = await req.json()

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

    // Return CSV file
    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="sms_campaign_contacts.csv"',
      }
    })

  } catch (error) {
    console.error('Error generating CSV:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
