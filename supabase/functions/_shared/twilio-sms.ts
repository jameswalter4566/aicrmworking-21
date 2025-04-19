
// Twilio SMS Utility Module
// This provides common functionality for Twilio SMS operations

// Helper for formatting phone numbers to E.164 format
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Ensure it starts with country code (assuming US numbers)
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  } else if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
    return `+${digitsOnly}`;
  } else if (digitsOnly.startsWith('+')) {
    return digitsOnly;
  } else {
    // Default case - just add + prefix
    return `+${digitsOnly}`;
  }
}

// Function to create and configure a Twilio client
export async function createTwilioClient() {
  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    
    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials are not configured");
    }
    
    console.log("Creating Twilio client with credentials");
    
    // Import Twilio using dynamic import to work in Deno
    const twilio = await import("npm:twilio@4.20.1");
    
    // Create client using the Twilio constructor
    return twilio.default(accountSid, authToken);
  } catch (error) {
    console.error("Error creating Twilio client:", error);
    throw new Error(`Failed to initialize Twilio client: ${error.message}`);
  }
}

// Send a single SMS message using Twilio
export async function sendSMS(
  to: string, 
  message: string, 
  options: { 
    from?: string, 
    mediaUrl?: string | string[],
    statusCallback?: string,
    prioritize?: boolean
  } = {}
) {
  try {
    const formattedTo = formatPhoneNumber(to);
    
    // Use the dedicated SMS phone number if available, otherwise fall back to the general Twilio number
    const fromNumber = options.from || 
                      Deno.env.get("TWILIO_NUMBER_SMS") || 
                      Deno.env.get("TWILIO_PHONE_NUMBER") || 
                      "+18336575981";
    const formattedFrom = formatPhoneNumber(fromNumber);
    
    console.log(`Creating Twilio client to send SMS from ${formattedFrom} to ${formattedTo}`);
    
    // Create the Twilio client
    const client = await createTwilioClient();
    
    if (!client || !client.messages) {
      throw new Error("Invalid Twilio client or messages API not available");
    }
    
    console.log("Twilio client created successfully, preparing message parameters");
    
    const messageParams: any = {
      to: formattedTo,
      from: formattedFrom,
      body: message
    };
    
    // Add optional parameters if provided
    if (options.mediaUrl) {
      messageParams.mediaUrl = options.mediaUrl;
    }
    
    if (options.statusCallback) {
      messageParams.statusCallback = options.statusCallback;
    }
    
    console.log("Sending SMS via Twilio with parameters:", JSON.stringify({
      to: formattedTo,
      from: formattedFrom,
      bodyLength: message.length,
      hasMediaUrl: Boolean(options.mediaUrl),
      hasStatusCallback: Boolean(options.statusCallback)
    }));
    
    const twilioMessage = await client.messages.create(messageParams);
    
    console.log(`SMS sent successfully with SID: ${twilioMessage.sid}, status: ${twilioMessage.status}`);
    
    return {
      success: true,
      messageId: twilioMessage.sid,
      status: twilioMessage.status,
      details: twilioMessage
    };
  } catch (error) {
    console.error("Error sending SMS via Twilio:", error);
    return {
      success: false,
      error: error.message || "Unknown error sending SMS",
      details: error
    };
  }
}

// Verify a Twilio webhook request signature
export function validateTwilioWebhook(request: Request): boolean {
  // This is a placeholder for webhook validation logic
  // In a production environment, you should verify the X-Twilio-Signature header
  // against the request body using the Twilio SDK
  
  const signature = request.headers.get('x-twilio-signature');
  console.log(`Validating Twilio signature: ${signature || 'No signature found'}`);
  
  // For now, we'll return true but this should be implemented properly
  // See: https://www.twilio.com/docs/usage/webhooks/webhooks-security
  
  return true;
}

// Parse Twilio webhook data
export function parseTwilioWebhook(formData: FormData) {
  const data: Record<string, string> = {};
  
  for (const [key, value] of formData.entries()) {
    data[key] = value.toString();
    console.log(`Parsed form data: ${key} = ${value.toString()}`);
  }
  
  return {
    messageSid: data.MessageSid || data.SmsSid,
    from: data.From,
    to: data.To,
    body: data.Body,
    numMedia: parseInt(data.NumMedia || "0", 10),
    mediaUrls: Array.from({ length: parseInt(data.NumMedia || "0", 10) }, (_, i) => 
      data[`MediaUrl${i}`]
    ).filter(Boolean),
    status: data.SmsStatus || data.MessageStatus,
    direction: data.Direction || (data.From && data.From !== Deno.env.get("TWILIO_NUMBER_SMS") ? "inbound" : "outbound"),
    timestamp: new Date().toISOString(),
    raw: data
  };
}
