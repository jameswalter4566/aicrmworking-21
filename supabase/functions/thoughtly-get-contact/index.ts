
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { id } = await req.json()
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contact ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get API Keys from environment variables
    const thoughtlyToken = Deno.env.get('THOUGHTLY_API_TOKEN')
    const thoughtlyTeamId = Deno.env.get('THOUGHTLY_TEAM_ID')
    
    if (!thoughtlyToken || !thoughtlyTeamId) {
      return new Response(
        JSON.stringify({ success: false, error: 'API credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Fetch the contact from Thoughtly
    const url = `https://app.thoughtly.ai/api/teams/${thoughtlyTeamId}/contact/${id}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${thoughtlyToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error fetching contact from Thoughtly:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch contact: ${response.status} ${response.statusText}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      )
    }
    
    const data = await response.json()
    
    // Also get local lead data as backup
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data: localLead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()
    
    // Combine the data with preference to Thoughtly data
    const combinedData = {
      ...localLead,
      ...data,
      success: true
    }
    
    return new Response(
      JSON.stringify(combinedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in thoughtly-get-contact:', error)
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
