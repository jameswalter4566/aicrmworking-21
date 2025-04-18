
import React, { useState } from "react";
import { Check, Loader2, Download, SendToBack, FileSignature, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

export const ConditionItem: React.FC<{ condition: LoanCondition; leadId?: string }> = ({ 
  condition,
  leadId 
}) => {
  const [isSendingForSignature, setIsSendingForSignature] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  
  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `LOE_${condition.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSendForSignature = async () => {
    if (!leadId || !condition.id || !condition.documentUrl) return;
    
    setIsSendingForSignature(true);
    try {
      const { data, error } = await supabase.functions.invoke('loe-generator', {
        body: { 
          leadId: String(leadId), // Convert leadId to string
          conditions: [condition],
          sendForSignature: true
        }
      });
      
      if (error) {
        toast.error("Failed to send document for signature");
        console.error('Error sending for signature:', error);
      } else if (data.success) {
        toast.success(`Document sent for signature`);
      }
    } catch (err) {
      console.error("Error in handleSendForSignature:", err);
      toast.error("An error occurred while sending document for signature");
    } finally {
      setIsSendingForSignature(false);
    }
  };
  
  const handleCheckStatus = async () => {
    if (!leadId || !condition.id || !condition.docuSignEnvelopeId) return;
    
    setIsCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('docusign-status-check', {
        body: {
          envelopeId: condition.docuSignEnvelopeId,
          leadId: String(leadId), // Convert leadId to string
          conditionId: condition.id,
          checkOnly: false // Download if completed
        }
      });
      
      if (error) {
        toast.error("Failed to check signature status");
        console.error('Error checking signature status:', error);
      } else if (data.success) {
        toast.success(`Signature status: ${data.status}`);
        
        if (data.signedDocumentUrl) {
          const { data: refreshData } = await supabase.functions.invoke('retrieve-conditions', {
            body: { leadId: String(leadId) } // Convert leadId to string
          });
          
          if (refreshData?.success && refreshData?.conditions) {
            toast.success("Signed document retrieved successfully!");
          }
        }
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
          
          {condition.documentUrl && !condition.docuSignEnvelopeId && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
              onClick={handleSendForSignature}
              disabled={isSendingForSignature}
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
