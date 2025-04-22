
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoanDetails {
  balance: number;
  rate: number;
  payment: number;
  term: number;
  type: string;
}

interface MortgageData {
  loanInformation?: {
    purpose?: string;
    loanAmount?: number;
    loanType?: string;
    interestRate?: number;
    loanTerm?: number;
  };
  propertyInformation?: {
    estimatedValue?: number;
    propertyAddress?: string;
  };
  borrower?: {
    monthlyIncome?: number;
    assets?: number;
  };
  currentMortgage?: {
    payment?: number;
    balance?: number;
    rate?: number;
    term?: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { leadId } = await req.json();

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError) throw new Error(`Failed to fetch lead: ${leadError.message}`);

    const mortgageData: MortgageData = lead.mortgage_data || {};
    
    // Calculate loan details
    const currentLoan: LoanDetails | undefined = mortgageData.currentMortgage ? {
      balance: mortgageData.currentMortgage.balance || 0,
      rate: mortgageData.currentMortgage.rate || 0,
      payment: mortgageData.currentMortgage.payment || 0,
      term: mortgageData.currentMortgage.term || 30,
      type: 'Conventional'
    } : undefined;

    const proposedLoan: LoanDetails = {
      balance: mortgageData.loanInformation?.loanAmount || 0,
      rate: mortgageData.loanInformation?.interestRate || 0,
      payment: calculateMonthlyPayment(
        mortgageData.loanInformation?.loanAmount || 0,
        mortgageData.loanInformation?.interestRate || 0,
        mortgageData.loanInformation?.loanTerm || 30
      ),
      term: mortgageData.loanInformation?.loanTerm || 30,
      type: mortgageData.loanInformation?.loanType || 'Conventional'
    };

    // Calculate monthly savings if refinancing
    const savings = currentLoan ? {
      monthly: currentLoan.payment - proposedLoan.payment,
      lifetime: (currentLoan.payment - proposedLoan.payment) * proposedLoan.term * 12
    } : undefined;

    const templateType = mortgageData.loanInformation?.purpose === 'refinance' ? 'refinance' : 'purchase';
    
    // Calculate data completeness
    const requiredFields = [
      'loanInformation.loanAmount',
      'loanInformation.interestRate',
      'loanInformation.loanTerm',
      'propertyInformation.estimatedValue',
      'borrower.monthlyIncome'
    ];
    
    const missingFields = requiredFields.filter(field => {
      const parts = field.split('.');
      let value = mortgageData;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined || value === null) return true;
      }
      return false;
    });

    const dataCompleteness = ((requiredFields.length - missingFields.length) / requiredFields.length) * 100;

    // Create pitch deck
    const { data: pitchDeck, error: createError } = await supabase
      .from('pitch_decks')
      .insert({
        title: `${lead.first_name} ${lead.last_name} - Mortgage Proposal`,
        description: `Mortgage proposal for ${mortgageData.propertyInformation?.propertyAddress || 'your new home'}`,
        template_type: templateType,
        client_last_name: lead.last_name,
        mortgage_data: {
          propertyValue: mortgageData.propertyInformation?.estimatedValue,
          currentLoan,
          proposedLoan,
          savings
        },
        client_info: {
          name: `${lead.first_name} ${lead.last_name}`,
          email: lead.email,
          phone: lead.phone1,
          address: lead.mailing_address
        },
        lead_id: leadId,
        created_by: lead.created_by,
        auto_generated: true,
        generation_source: 'onboarding',
        data_completeness: dataCompleteness,
        missing_data_points: missingFields,
        generation_date: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) throw new Error(`Failed to create pitch deck: ${createError.message}`);

    // Update lead with pitch deck status
    await supabase
      .from('leads')
      .update({
        pitch_deck_status: {
          generated: true,
          generatedAt: new Date().toISOString(),
          pitchDeckId: pitchDeck.id,
          needsReview: true,
          reviewedAt: null,
          sentToClient: false,
          sentAt: null
        }
      })
      .eq('id', leadId);

    return new Response(
      JSON.stringify({ success: true, data: pitchDeck }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

// Helper function to calculate monthly payment
function calculateMonthlyPayment(principal: number, rate: number, term: number): number {
  const monthlyRate = (rate / 100) / 12;
  const numberOfPayments = term * 12;
  
  if (monthlyRate === 0) return principal / numberOfPayments;
  
  const payment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  
  return Math.round(payment * 100) / 100;
}
