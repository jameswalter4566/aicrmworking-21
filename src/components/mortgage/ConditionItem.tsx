import React, { useState, useEffect } from "react";
import { Check, Loader2, Download, SendToBack, FileSignature, FileCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface LoanCondition {
  id?: string;
  text: string;
  status?: string;
  documentUrl?: string;
  isProcessing?: boolean;
  isCompleted?: boolean;
  docuSignEnvelopeId?: string;
  docuSignStatus?: string;
  signedDocumentUrl?: string;
}

export const ConditionItem: React.FC<{ condition: LoanCondition; leadId?: string | number }> = ({ 
  condition,
  leadId 
}) => {
  const [isSendingForSignature, setIsSendingForSignature] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [leadData, setLeadData] = useState<any>(null);
  const [signerEmail, setSignerEmail] = useState("");
  const [docuSignError, setDocuSignError] = useState<string | null>(null);
  
  useEffect(() => {
    if (leadId) {
      fetchLeadData(String(leadId));
    }
  }, [leadId]);
  
  const fetchLeadData = async (leadId: string) => {
    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching lead data:", error);
      } else if (lead) {
        setLeadData(lead);
      }
    } catch (err) {
      console.error("Error in fetchLeadData:", err);
    }
  };
  
  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `LOE_${condition.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSendForSignature = async () => {
    if (!condition.id || !condition.documentUrl) {
      toast.error("Missing required information to send for signature");
      console.error("Missing conditionId or documentUrl", {
        leadId,
        conditionId: condition.id,
        documentUrl: condition.documentUrl
      });
      return;
    }
    
    if (!signerEmail) {
      toast.error("Please enter a recipient email address");
      return;
    }
    
    setIsSendingForSignature(true);
    setDocuSignError(null);
    
    try {
      console.log("Sending condition for signature:", condition.id);
      console.log("Using recipient email:", signerEmail);
      console.log("Lead ID being used:", leadId);
      
      // Create a safe recipient name based on lead data
      const recipientName = leadData ? 
        `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() || 'Borrower' : 
        'Borrower';
      
      const { data, error } = await supabase.functions.invoke('loe-generator', {
        body: { 
          leadId: String(leadId),
          conditions: [condition],
          sendForSignature: true,
          recipientEmail: signerEmail,
          recipientName: recipientName
        }
      });
      
      if (error) {
        toast.error("Failed to send document for signature");
        console.error('Error sending for signature:', error);
      } else if (data?.success) {
        toast.success(`Document sent for signature successfully`);
        const { data: refreshData } = await supabase.functions.invoke('retrieve-conditions', {
          body: { leadId: String(leadId) }
        });
        
        if (refreshData?.success && refreshData?.conditions) {
          console.log("Conditions refreshed after sending for signature");
        }
      } else {
        // Check if there's a DocuSign-specific error
        const docusignError = data?.results?.[0]?.error;
        if (docusignError && docusignError.includes("DocuSign error")) {
          // Store the DocuSign error message for display in the UI
          setDocuSignError("DocuSign connection error. The document was generated successfully but couldn't be sent for signature.");
          // Show a more user-friendly error message
          toast.error("DocuSign connection error. You can still download the document.");
        } else {
          toast.error(data?.error || "Unknown error sending document for signature");
          console.error('Unknown error in loe-generator:', data);
        }
      }
    } catch (err) {
      console.error("Error in handleSendForSignature:", err);
      toast.error("An error occurred while sending document for signature");
    } finally {
      setIsSendingForSignature(false);
    }
  };
  
  const handleCheckStatus = async () => {
    if (!condition.id || !condition.docuSignEnvelopeId) {
      toast.error("Missing required information to check signature status");
      return;
    }
    
    setIsCheckingStatus(true);
    try {
      console.log("Checking signature status for envelope:", condition.docuSignEnvelopeId);
      
      const { data, error } = await supabase.functions.invoke('docusign-status-check', {
        body: {
          envelopeId: condition.docuSignEnvelopeId,
          leadId: String(leadId),
          conditionId: condition.id,
          checkOnly: false
        }
      });
      
      if (error) {
        toast.error("Failed to check signature status");
        console.error('Error checking signature status:', error);
      } else if (data?.success) {
        toast.success(`Signature status: ${data.status}`);
        
        if (data.signedDocumentUrl) {
          toast.success("Signed document retrieved successfully!");
          
          const { data: refreshData } = await supabase.functions.invoke('retrieve-conditions', {
            body: { leadId: String(leadId) }
          });
          
          if (refreshData?.success && refreshData?.conditions) {
            console.log("Conditions refreshed with signed document");
          }
        }
      } else {
        toast.error(data?.error || "Unknown error checking signature status");
        console.error('Unknown error in docusign-status-check:', data);
      }
    } catch (err) {
      console.error("Error in handleCheckStatus:", err);
      toast.error("An error occurred while checking signature status");
    } finally {
      setIsCheckingStatus(false);
    }
  };
  
  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100">
      <div className="flex-1">
        <p className="text-sm text-blue-900">{condition.text}</p>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {condition.documentUrl && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs"
              onClick={() => handleDownload(condition.documentUrl!)}
            >
              <Download className="h-3 w-3 mr-1" />
              Download LOE
            </Button>
          )}
          
          {condition.documentUrl && !condition.docuSignEnvelopeId && !docuSignError && (
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="Enter signer email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="h-7 text-xs w-[200px]"
                size="sm"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 px-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                onClick={handleSendForSignature}
                disabled={isSendingForSignature || !signerEmail}
              >
                {isSendingForSignature ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <SendToBack className="h-3 w-3 mr-1" />
                    Send for Signature
                  </>
                )}
              </Button>
            </div>
          )}

          {docuSignError && (
            <div className="flex flex-col w-full">
              <p className="text-xs text-amber-600 mb-1">{docuSignError}</p>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="Update signer email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  className="h-7 text-xs w-[200px]"
                  size="sm"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 px-2 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100"
                  onClick={handleSendForSignature}
                  disabled={isSendingForSignature || !signerEmail}
                >
                  <SendToBack className="h-3 w-3 mr-1" />
                  Retry Signature
                </Button>
              </div>
            </div>
          )}
          
          {condition.docuSignEnvelopeId && !condition.signedDocumentUrl && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100"
              onClick={handleCheckStatus}
              disabled={isCheckingStatus}
            >
              {isCheckingStatus ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <FileSignature className="h-3 w-3 mr-1" />
                  Check Signature ({condition.docuSignStatus || "pending"})
                </>
              )}
            </Button>
          )}
          
          {condition.signedDocumentUrl && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs bg-green-50 text-green-700 hover:bg-green-100"
              onClick={() => handleDownload(condition.signedDocumentUrl!)}
            >
              <FileCheck className="h-3 w-3 mr-1" />
              Download Signed LOE
            </Button>
          )}
        </div>
        
        {condition.docuSignStatus && (
          <div className="mt-1">
            <span className={`text-xs ${
              condition.docuSignStatus === 'completed' ? 'text-green-600' : 
              condition.docuSignStatus === 'sent' ? 'text-blue-600' : 
              condition.docuSignStatus === 'delivered' ? 'text-amber-600' : 
              'text-gray-600'
            }`}>
              DocuSign status: {condition.docuSignStatus}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {condition.isProcessing && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-mortgage-purple" />
            <Progress value={66} className="w-16 h-1.5" />
          </>
        )}
        {condition.isCompleted && (
          <Check className="h-4 w-4 text-green-500" />
        )}
      </div>
    </div>
  );
};
