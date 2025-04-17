import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProcessingStatusContainer from "./ProcessingStatusContainer";
import { Progress } from "@/components/ui/progress";

interface EmailConditionsParserProps {
  clientLastName: string;
  loanNumber: string;
  leadId: string;
  onConditionsFound: (conditions: any) => void;
}

const EmailConditionsParser: React.FC<EmailConditionsParserProps> = ({ 
  clientLastName, 
  loanNumber,
  leadId,
  onConditionsFound 
}) => {
  const [emailContent, setEmailContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<Array<{
    id: string;
    label: string;
    status: "pending" | "processing" | "completed";
  }>>([
    { id: "parse", label: "Parsing email content", status: "pending" },
    { id: "extract", label: "Extracting conditions", status: "pending" },
    { id: "loe", label: "Generating LOE documents", status: "pending" }
  ]);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const updateStepStatus = (stepId: string, status: "pending" | "processing" | "completed") => {
    setProcessingSteps(steps => 
      steps.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailContent.trim()) {
      toast.error("Please paste the email content.");
      return;
    }
    
    setIsProcessing(true);
    updateStepStatus("parse", "processing");
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-underwriting-email', {
        body: { 
          emailContent,
          clientLastName,
          loanNumber
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }

      updateStepStatus("parse", "completed");
      updateStepStatus("extract", "processing");
      
      const totalConditionsCount = Object.values(data?.conditions || {}).reduce((sum: number, arr: unknown) => {
        return Array.isArray(arr) ? sum + arr.length : sum;
      }, 0);
    
      if (data.success && data.conditions) {
        onConditionsFound(data.conditions);
        toast.success(`${totalConditionsCount} conditions extracted from email`);
        
        updateStepStatus("extract", "completed");
        
        if (leadId && totalConditionsCount > 0) {
          updateStepStatus("loe", "processing");
          
          try {
            const { data: loeData, error: loeError } = await supabase.functions.invoke('loe-generator', {
              body: { 
                leadId,
                conditions: [
                  ...(data.conditions.masterConditions || []),
                  ...(data.conditions.generalConditions || []),
                  ...(data.conditions.priorToFinalConditions || []),
                  ...(data.conditions.complianceConditions || [])
                ]
              }
            });
            
            if (loeError) {
              toast.error("Failed to generate Letters of Explanation");
            } else if (loeData.success) {
              toast.success(`Generated ${loeData.processedCount} Letters of Explanation`);
              const { data: refreshData } = await supabase.functions.invoke('retrieve-conditions', {
                body: { leadId }
              });
              
              if (refreshData?.success && refreshData?.conditions) {
                onConditionsFound(refreshData.conditions);
              }
            }
          } catch (loeErr) {
            console.error("Error generating LOEs:", loeErr);
            toast.error("An error occurred while generating Letters of Explanation");
          }
          
          updateStepStatus("loe", "completed");
        }
      } else {
        toast.warning(data.error || "No conditions found in the email content");
      }
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Paste Underwriting Email</CardTitle>
        <CardDescription>
          Extract loan conditions from underwriting approval emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isProcessing && (
          <ProcessingStatusContainer 
            steps={processingSteps}
            className="mb-4"
          />
        )}
        
        <Textarea
          placeholder="Paste email content here..."
          value={emailContent}
          onChange={(e) => setEmailContent(e.target.value)}
          rows={8}
          className="resize-none"
        />
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full relative"
          onClick={handleCopyClick}
          disabled={copied}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy Example
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter>
        <Button 
          className="ml-auto bg-mortgage-purple hover:bg-mortgage-darkPurple text-white"
          onClick={handleSubmit}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Parse Email"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EmailConditionsParser;
