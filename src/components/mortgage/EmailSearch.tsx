
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Search } from "lucide-react";
import { toast } from "sonner";
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
    { id: "search", label: "Searching emails", status: "pending" },
    { id: "analyze", label: "Analyzing approval letter", status: "pending" },
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
      console.log("Starting email search with parameters:", { clientLastName, loanNumber });
      
      // Search for approval emails
      const { data: searchData, error: searchError } = await supabase.functions.invoke('search-approval-emails', {
        body: { 
          clientLastName,
          loanNumber,
          emailSender: "underwriting@" // This will match any underwriting domain
        }
      });
      
      console.log("Search response:", searchData, searchError);
      
      if (searchError) {
        console.error("Error searching emails:", searchError);
        throw new Error(`Error searching emails: ${searchError.message}`);
      }
      
      updateStepStatus("search", "completed");
      
      if (!searchData.success || !searchData.emails || searchData.emails.length === 0) {
        toast.warning("No approval emails found. Try using the PDF upload option.");
        setIsSearching(false);
        return;
      }
      
      // Process the first email that has PDF attachments
      const emailWithPDF = searchData.emails.find(email => 
        email.attachments && email.attachments.some(att => att.mimeType === "application/pdf")
      );
      
      if (!emailWithPDF) {
        toast.warning("No PDF attachments found in approval emails.");
        setIsSearching(false);
        return;
      }
      
      updateStepStatus("analyze", "processing");
      
      const pdfAttachment = emailWithPDF.attachments.find(att => att.mimeType === "application/pdf");
      console.log("Found PDF attachment:", pdfAttachment);
      
      // Parse the PDF attachment
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-approval-document', {
        body: { 
          emailId: emailWithPDF.id,
          attachmentId: pdfAttachment.attachmentId,
        }
      });
      
      if (parseError) {
        console.error("Error parsing document:", parseError);
        throw new Error(`Error parsing document: ${parseError.message}`);
      }
      
      console.log("Parse response:", parseData);
      
      updateStepStatus("analyze", "completed");
      updateStepStatus("extract", "processing");
      
      if (parseData.success && parseData.conditions) {
        // Save conditions
        const { error: saveError } = await supabase.functions.invoke('update-conditions', {
          body: { 
            leadId,
            conditions: parseData.conditions
          }
        });
        
        if (saveError) {
          console.error("Error saving conditions:", saveError);
          throw new Error(`Error saving conditions: ${saveError.message}`);
        }
        
        onConditionsFound(parseData.conditions);
        
        // Generate LOEs
        const allConditions = [
          ...(parseData.conditions.masterConditions || []),
          ...(parseData.conditions.generalConditions || []),
          ...(parseData.conditions.priorToFinalConditions || []),
          ...(parseData.conditions.complianceConditions || [])
        ];
        
        if (allConditions.length > 0) {
          const { data: loeData, error: loeError } = await supabase.functions.invoke('loe-generator', {
            body: { 
              leadId,
              conditions: allConditions
            }
          });
          
          if (loeError) {
            console.error("Error generating LOEs:", loeError);
          } else if (loeData.success) {
            toast.success("Successfully generated Letters of Explanation");
          }
        }
        
        updateStepStatus("extract", "completed");
        toast.success("Successfully extracted conditions from approval email");
      } else {
        throw new Error("Failed to parse conditions from the document");
      }
    } catch (error: any) {
      console.error('Error during email search process:', error);
      toast.error(error.message || "An error occurred while processing the approval letter");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      {isSearching && (
        <ProcessingStatusContainer 
          steps={processingSteps}
          className="mb-4"
        />
      )}
      
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-blue-100 rounded-lg space-y-4">
        <div className="text-center space-y-2 mb-4">
          <h3 className="text-lg font-semibold text-blue-900">
            AI Email Search
          </h3>
          <p className="text-sm text-blue-600">
            Click below to search your email for approval letters
          </p>
        </div>
        
        <Button
          onClick={handleSearch}
          disabled={isSearching}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white w-full max-w-sm"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Search Approval Emails
            </>
          )}
        </Button>
        
        {!isSearching && (
          <div className="text-xs text-blue-500 italic mt-2">
            We'll search your connected email account for approval letters
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailSearch;
