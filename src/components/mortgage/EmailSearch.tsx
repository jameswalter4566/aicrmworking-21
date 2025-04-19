
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProcessingStatusContainer from "./ProcessingStatusContainer";

interface EmailSearchProps {
  clientLastName: string;
  loanNumber: string;
  leadId: string;
  onConditionsFound: (conditions: any) => void;
}

const EmailSearch: React.FC<EmailSearchProps> = ({ 
  clientLastName, 
  loanNumber,
  leadId,
  onConditionsFound 
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<Array<{
    id: string;
    label: string;
    status: "pending" | "processing" | "completed";
  }>>([
    { id: "search", label: "Searching Gmail for approval emails", status: "pending" },
    { id: "analyze", label: "Analyzing email contents", status: "pending" },
    { id: "extract", label: "Extracting conditions", status: "pending" }
  ]);
  
  const updateStepStatus = (stepId: string, status: "pending" | "processing" | "completed") => {
    setProcessingSteps(steps => 
      steps.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    );
  };
  
  const handleSearch = async () => {
    setIsSearching(true);
    updateStepStatus("search", "processing");
    
    try {
      // Search emails
      const { data: searchData, error: searchError } = await supabase.functions.invoke('search-approval-emails', {
        body: { 
          clientLastName,
          loanNumber
        }
      });
      
      if (searchError) throw new Error(searchError.message);
      if (!searchData.success) throw new Error(searchData.error || "Failed to search emails");
      
      updateStepStatus("search", "completed");
      updateStepStatus("analyze", "processing");
      
      const emails = searchData.emails || [];
      if (emails.length === 0) {
        toast.warning("No approval emails found");
        return;
      }
      
      // Find the most recent email with PDF attachments
      const emailWithAttachments = emails.find(email => email.attachments?.length > 0);
      if (!emailWithAttachments) {
        toast.warning("No approval documents found in emails");
        return;
      }
      
      // Parse the email content
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-underwriting-email', {
        body: { 
          emailContent: emailWithAttachments.snippet,
          clientLastName,
          loanNumber
        }
      });
      
      if (parseError) throw new Error(parseError.message);
      
      updateStepStatus("analyze", "completed");
      updateStepStatus("extract", "processing");
      
      if (parseData.success && parseData.conditions) {
        onConditionsFound(parseData.conditions);
        
        const totalConditions = Object.values(parseData.conditions).reduce((sum: number, arr: any[]) => {
          return sum + (Array.isArray(arr) ? arr.length : 0);
        }, 0);
        
        toast.success(`Found ${totalConditions} conditions in approval email`);
        updateStepStatus("extract", "completed");
      }
      
    } catch (error: any) {
      console.error("Error searching emails:", error);
      toast.error(error.message || "Failed to search and analyze emails");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Search Approval Emails</CardTitle>
        <CardDescription>
          Automatically search your Gmail for loan approval emails and extract conditions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSearching && (
          <ProcessingStatusContainer 
            steps={processingSteps}
            className="mb-4"
          />
        )}
        
        <Button 
          className="w-full bg-mortgage-purple hover:bg-mortgage-darkPurple text-white"
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching Emails...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Search Approval Emails
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmailSearch;
