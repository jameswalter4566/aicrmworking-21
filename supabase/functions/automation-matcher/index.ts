
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Available automation types
const AUTOMATION_TYPES = {
  LOE: 'loe-generator',
  INCOME_VERIFICATION: 'income-verification',
  ASSET_VERIFICATION: 'asset-verification',
  INSURANCE: 'insurance-verification',
  TITLE: 'title-verification',
  MANUAL: 'manual-processing'
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Automation matcher function started');
    
    // Parse request body
    const { leadId, conditions } = await req.json();
    
    if (!leadId || !conditions) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required parameters: leadId and conditions" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing conditions for lead ID: ${leadId}`);
    console.log(`Received conditions:`, JSON.stringify(conditions).substring(0, 200) + '...');
    
    // Process all condition categories
    const allConditions = [
      ...(conditions.masterConditions || []).map(c => ({...c, category: 'masterConditions'})),
      ...(conditions.generalConditions || []).map(c => ({...c, category: 'generalConditions'})),
      ...(conditions.priorToFinalConditions || []).map(c => ({...c, category: 'priorToFinalConditions'})),
      ...(conditions.complianceConditions || []).map(c => ({...c, category: 'complianceConditions'}))
    ];

    console.log(`Total conditions to process: ${allConditions.length}`);
    
    if (allConditions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No conditions found to process" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Initialize results tracking
    const automationResults = {
      automatedConditionIds: [],
      manualConditionIds: [],
      pendingConditionIds: [],
      automationSummary: {}
    };
    
    // Process each condition with OpenAI to determine automation type
    const processedConditions = await Promise.all(
      allConditions.map(async (condition) => {
        // Skip conditions without text
        if (!condition.text && !condition.description) {
          console.log(`Skipping condition with ID ${condition.id} - no text content`);
          automationResults.manualConditionIds.push(condition.id);
          return null;
        }

        const conditionText = condition.text || condition.description;
        const automationType = await classifyConditionWithOpenAI(conditionText);
        
        console.log(`Classified condition "${conditionText.substring(0, 50)}..." as: ${automationType}`);
        
        // Track condition in the appropriate automation category
        if (!automationResults.automationSummary[automationType]) {
          automationResults.automationSummary[automationType] = {
            conditionIds: [],
            success: false,
            details: []
          };
        }
        
        automationResults.automationSummary[automationType].conditionIds.push(condition.id);
        
        // If not manual processing, add to automated conditions
        if (automationType !== AUTOMATION_TYPES.MANUAL) {
          automationResults.automatedConditionIds.push(condition.id);
        } else {
          automationResults.manualConditionIds.push(condition.id);
        }
        
        // Return processed condition with automation type
        return {
          ...condition,
          automationType,
          leadId
        };
      })
    );
    
    // Filter out null entries
    const validProcessedConditions = processedConditions.filter(c => c !== null);
    
    console.log(`Successfully classified ${validProcessedConditions.length} conditions`);
    
    // Route conditions to their respective automations
    const automationPromises = [];
    
    // Group conditions by automation type
    const conditionsByAutomationType = validProcessedConditions.reduce((acc, condition) => {
      if (!condition) return acc;
      
      if (!acc[condition.automationType]) {
        acc[condition.automationType] = [];
      }
      
      acc[condition.automationType].push(condition);
      return acc;
    }, {});
    
    // Process each automation type
    for (const [automationType, conditions] of Object.entries(conditionsByAutomationType)) {
      if (automationType === AUTOMATION_TYPES.MANUAL) {
        console.log(`Skipping ${conditions.length} conditions marked for manual processing`);
        continue;
      }
      
      console.log(`Routing ${conditions.length} conditions to ${automationType}`);
      
      try {
        // Process based on automation type
        let result;
        
        // Handle LOE generator specifically - now using our new edge function
        if (automationType === AUTOMATION_TYPES.LOE) {
          console.log(`Processing ${conditions.length} conditions with LOE generator`);
          try {
            // Call our LOE generator function
            const { data: loeResult, error: loeError } = await supabase.functions.invoke('loe-generator', {
              body: { 
                leadId, 
                conditions 
              }
            });
            
            if (loeError) {
              console.error("Error from LOE generator:", loeError);
              throw new Error(`LOE generation failed: ${loeError.message || "Unknown error"}`);
            }
            
            console.log("LOE generator completed successfully:", JSON.stringify(loeResult).substring(0, 200) + '...');
            result = {
              success: loeResult.success,
              details: loeResult
            };
          } catch (loeExcept) {
            console.error("Exception in LOE generator:", loeExcept);
            throw loeExcept;
          }
        } else {
          // For other automation types, use the mock function
          result = await mockAutomationExecution(automationType, conditions, leadId);
        }
        
        // Update the automation summary with results
        automationResults.automationSummary[automationType].success = result.success;
        automationResults.automationSummary[automationType].details = result.details;
        
        // Update condition statuses in the database
        if (result.success) {
          await updateConditionAutomationStatus(leadId, conditions, automationType, "completed");
        } else {
          await updateConditionAutomationStatus(leadId, conditions, automationType, "failed");
          // Move failed automations to manual
          conditions.forEach(c => {
            const index = automationResults.automatedConditionIds.indexOf(c.id);
            if (index !== -1) {
              automationResults.automatedConditionIds.splice(index, 1);
              automationResults.manualConditionIds.push(c.id);
            }
          });
        }
      } catch (error) {
        console.error(`Error executing ${automationType}:`, error);
        
        // Mark automation as failed
        automationResults.automationSummary[automationType].success = false;
        automationResults.automationSummary[automationType].details = { error: error.message };
        
        // Update condition statuses in the database
        await updateConditionAutomationStatus(leadId, conditions, automationType, "failed");
        
        // Move failed automations to manual
        conditions.forEach(c => {
          const index = automationResults.automatedConditionIds.indexOf(c.id);
          if (index !== -1) {
            automationResults.automatedConditionIds.splice(index, 1);
            automationResults.manualConditionIds.push(c.id);
          }
        });
      }
    }
    
    console.log('Automation matcher completed successfully');
    console.log(`Summary: ${automationResults.automatedConditionIds.length} automated, ${automationResults.manualConditionIds.length} manual`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        automationResults 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in automation-matcher function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "An unknown error occurred" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Classifies a condition text using OpenAI to determine the appropriate automation
 */
async function classifyConditionWithOpenAI(conditionText) {
  if (!OPENAI_API_KEY) {
    console.warn("OpenAI API key not found. Using rule-based classification instead.");
    return ruleBasedClassification(conditionText);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert mortgage condition classifier. Your task is to analyze mortgage loan conditions and categorize them into the appropriate automation type.
            
Automation Types:
1. loe-generator - For all Letter of Explanation (LOE) conditions, including credit inquiries, large deposits, employment gaps, etc.
2. income-verification - For conditions requesting paystubs, W-2s, employment verification, etc.
3. asset-verification - For conditions requesting bank statements, investment account verification, etc.
4. insurance-verification - For conditions requesting homeowners insurance, flood insurance, etc.
5. title-verification - For conditions regarding title work, legal descriptions, etc.
6. manual-processing - For complex conditions that don't fit neatly into other categories or require human judgment

Respond with only the exact name of the appropriate automation type from the list above, no explanation.`
          },
          {
            role: 'user',
            content: conditionText
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      })
    });

    if (!response.ok) {
      console.error('OpenAI API Error:', await response.text());
      return ruleBasedClassification(conditionText);
    }

    const data = await response.json();
    let automationType = data.choices[0].message.content.trim().toLowerCase();
    
    // Map to our exact automation types if needed
    const automationTypeMap = {
      'loe-generator': AUTOMATION_TYPES.LOE,
      'loe': AUTOMATION_TYPES.LOE,
      'letter of explanation': AUTOMATION_TYPES.LOE,
      'income-verification': AUTOMATION_TYPES.INCOME_VERIFICATION,
      'income verification': AUTOMATION_TYPES.INCOME_VERIFICATION,
      'asset-verification': AUTOMATION_TYPES.ASSET_VERIFICATION,
      'asset verification': AUTOMATION_TYPES.ASSET_VERIFICATION,
      'insurance-verification': AUTOMATION_TYPES.INSURANCE,
      'insurance verification': AUTOMATION_TYPES.INSURANCE,
      'title-verification': AUTOMATION_TYPES.TITLE,
      'title verification': AUTOMATION_TYPES.TITLE,
      'manual-processing': AUTOMATION_TYPES.MANUAL,
      'manual processing': AUTOMATION_TYPES.MANUAL
    };
    
    return automationTypeMap[automationType] || AUTOMATION_TYPES.MANUAL;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    // Fallback to rule-based classification
    return ruleBasedClassification(conditionText);
  }
}

/**
 * Simple rule-based classification as a fallback when OpenAI is unavailable
 */
function ruleBasedClassification(conditionText) {
  const text = conditionText.toLowerCase();
  
  // LOE patterns - now with more detailed matching for better accuracy
  if (text.includes('letter of explanation') || 
      text.includes('loe') || 
      text.includes('explain') || 
      text.includes('explanation') ||
      text.includes('clarify') ||
      text.includes('clarification') ||
      text.includes('credit inquir') ||
      text.includes('large deposit') ||
      text.includes('employment gap') ||
      text.includes('address') && (text.includes('discrepanc') || text.includes('histor')) ||
      text.includes('name') && (text.includes('variation') || text.includes('discrepanc'))) {
    return AUTOMATION_TYPES.LOE;
  }
  
  // Income verification patterns
  if (text.includes('paystub') || 
      text.includes('w-2') || 
      text.includes('w2') || 
      text.includes('income') || 
      text.includes('employment verification') || 
      text.includes('salary') ||
      text.includes('tax return') ||
      text.includes('earnings')) {
    return AUTOMATION_TYPES.INCOME_VERIFICATION;
  }
  
  // Asset verification patterns
  if (text.includes('bank statement') || 
      text.includes('account statement') || 
      text.includes('investment') || 
      text.includes('asset') || 
      text.includes('funds') || 
      text.includes('deposit') ||
      text.includes('savings') ||
      text.includes('checking account')) {
    return AUTOMATION_TYPES.ASSET_VERIFICATION;
  }
  
  // Insurance patterns
  if (text.includes('insurance') || 
      text.includes('hazard') || 
      text.includes('flood') || 
      text.includes('policy') ||
      text.includes('coverage') ||
      text.includes('homeowner')) {
    return AUTOMATION_TYPES.INSURANCE;
  }
  
  // Title patterns
  if (text.includes('title') || 
      text.includes('deed') || 
      text.includes('legal description') || 
      text.includes('survey') ||
      text.includes('property boundary') ||
      text.includes('encumbrance') ||
      text.includes('lien')) {
    return AUTOMATION_TYPES.TITLE;
  }
  
  // Default to manual processing
  return AUTOMATION_TYPES.MANUAL;
}

/**
 * Mock function to simulate calling the actual automation functions
 */
async function mockAutomationExecution(automationType, conditions, leadId) {
  // Add a small delay to simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`Mock execution of ${automationType} for ${conditions.length} conditions`);
  
  // Sample success rates for different automation types
  const successRates = {
    [AUTOMATION_TYPES.LOE]: 0.95,
    [AUTOMATION_TYPES.INCOME_VERIFICATION]: 0.9,
    [AUTOMATION_TYPES.ASSET_VERIFICATION]: 0.85,
    [AUTOMATION_TYPES.INSURANCE]: 0.8,
    [AUTOMATION_TYPES.TITLE]: 0.75,
    [AUTOMATION_TYPES.MANUAL]: 0
  };
  
  // Randomly determine success based on success rate
  const successRate = successRates[automationType] || 0.5;
  const isSuccess = Math.random() <= successRate;
  
  if (isSuccess) {
    return {
      success: true,
      details: {
        processedConditions: conditions.length,
        automationType,
        mockExecutionId: `exec-${Date.now()}`
      }
    };
  } else {
    return {
      success: false,
      details: {
        error: `Failed to process ${automationType}`,
        reason: "Mock failure for testing purposes"
      }
    };
  }
}

/**
 * Updates the automation status of conditions in the database
 */
async function updateConditionAutomationStatus(leadId, conditions, automationType, status) {
  try {
    // Get the current conditions data
    const { data: conditionsData, error: fetchError } = await supabase
      .from('loan_conditions')
      .select('conditions_data')
      .eq('lead_id', leadId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching conditions data:', fetchError);
      return;
    }
    
    if (!conditionsData || !conditionsData.conditions_data) {
      console.error('No conditions data found for lead ID:', leadId);
      return;
    }
    
    // Deep clone the conditions data
    const updatedConditionsData = JSON.parse(JSON.stringify(conditionsData.conditions_data));
    
    // Update each condition that was processed
    conditions.forEach(condition => {
      const { id, category } = condition;
      
      // Find and update the condition
      if (updatedConditionsData[category]) {
        const conditionIndex = updatedConditionsData[category].findIndex(c => c.id === id);
        
        if (conditionIndex !== -1) {
          updatedConditionsData[category][conditionIndex] = {
            ...updatedConditionsData[category][conditionIndex],
            automation: {
              type: automationType,
              status: status,
              timestamp: new Date().toISOString()
            },
            notes: `${updatedConditionsData[category][conditionIndex].notes || ''}\nAutomation [${automationType}] ${status} at ${new Date().toLocaleString()}`
          };
        }
      }
    });
    
    // Update the conditions data in the database
    const { error: updateError } = await supabase
      .from('loan_conditions')
      .update({
        conditions_data: updatedConditionsData,
        updated_at: new Date().toISOString()
      })
      .eq('lead_id', leadId);
    
    if (updateError) {
      console.error('Error updating conditions data:', updateError);
    }
  } catch (error) {
    console.error('Error updating condition automation status:', error);
  }
}
