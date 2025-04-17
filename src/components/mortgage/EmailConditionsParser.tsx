import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLoanProgress } from "@/hooks/use-loan-progress";
import { Progress } from "@/components/ui/progress";

interface EmailParserProps {
  clientLastName: string;
  loanNumber: string;
  leadId: string;
  onConditionsFound: (conditions: any) => void;
}

const EmailConditionsParser: React.FC<EmailParserProps> = ({ 
  clientLastName, 
  loanNumber,
  leadId,
  onConditionsFound
}) => {
  const [emailContent, setEmailContent] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const { updateLoanProgress } = useLoanProgress();
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEmailContent(e.target.value);
  };
  
  const analyzeConditions = async () => {
    if (!emailContent.trim()) {
      toast.error("Please paste the email content first");
      return;
    }
    
    setIsAnalyzing(true);
    setProgress(10); // Start progress
    
    try {
      setProgress(30); // Incremental progress
      // Call the OpenAI API to analyze the content
      const { data, error } = await supabase.functions.invoke('parse-approval-document', {
        body: { 
          content: emailContent,
          clientLastName,
          loanNumber
        }
      });
      
      setProgress(50); // More progress
      
      if (error) {
        throw new Error(`API Error: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || "Failed to parse conditions");
      }
      
      setProgress(70); // More progress
      
      // Extract the conditions
      const conditions = data.conditions;
      
      // Check if we got valid conditions back
      if (!conditions || (
        (!conditions.masterConditions || conditions.masterConditions.length === 0) && 
        (!conditions.generalConditions || conditions.generalConditions.length === 0) && 
        (!conditions.priorToFinalConditions || conditions.priorToFinalConditions.length === 0) && 
        (!conditions.complianceConditions || conditions.complianceConditions.length === 0)
      )) {
        throw new Error("No conditions could be extracted from the email content");
      }
      
      setProgress(85); // Almost done
      
      // Save the conditions to the database
      if (leadId) {
        const { error: saveError } = await supabase.functions.invoke('update-conditions', {
          body: { 
            leadId,
            conditions
          }
        });
        
        if (saveError) {
          console.error("Error saving conditions:", saveError);
          toast.error("Failed to save extracted conditions");
        } else {
          toast.success("Successfully extracted and saved conditions");
          
          // Update loan status to Approved since conditions were found
          try {
            const result = await updateLoanProgress(leadId, "approved", "Automatically set to Approved based on conditions from email");
            
            if (result.success) {
              toast.success("Loan status updated to Approved");
            } else {
              console.error("Error updating loan status:", result.error);
              toast.warning("Conditions extracted but failed to update loan status");
            }
          } catch (updateErr) {
            console.error("Exception updating loan status:", updateErr);
            toast.warning("Conditions extracted but could not update loan status");
          }
        }
      }
      
      setProgress(100); // Complete!
      
      // Notify parent component about the conditions
      onConditionsFound(conditions);
      
      // Clear the textarea
      setEmailContent("");
      
    } catch (error: any) {
      console.error("Error analyzing conditions:", error);
      toast.error(error.message || "Failed to analyze conditions");
    } finally {
      // Reset progress after a short delay to show completion
      setTimeout(() => {
        setProgress(0);
        setIsAnalyzing(false);
      }, 500);
    }
  };
  
  return (
    <div className="space-y-4">
      {isAnalyzing && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full h-2" />
          <p className="text-sm text-gray-500 text-center">
            {progress < 30 && "Initializing analysis..."}
            {progress >= 30 && progress < 50 && "Processing content..."}
            {progress >= 50 && progress < 70 && "Extracting conditions..."}
            {progress >= 70 && progress < 85 && "Validating data..."}
            {progress >= 85 && progress < 100 && "Saving conditions..."}
            {progress === 100 && "Complete!"}
          </p>
        </div>
      )}
      
      <div>
        <p className="text-sm text-gray-600 mb-2">
          Paste the approval email content here. Our AI will automatically extract the loan conditions.
        </p>
        <Textarea 
          value={emailContent}
          onChange={handleContentChange}
          placeholder="Paste the email content containing loan conditions here..."
          rows={10}
          className="font-mono text-sm"
        />
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={analyzeConditions}
          disabled={isAnalyzing || !emailContent.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Extract Conditions"
          )}
        </Button>
      </div>
      
      <div className="text-sm text-blue-600 italic">
        <p>Tip: For best results, include the full email with all condition sections.</p>
      </div>
    </div>
  );
};

export default EmailConditionsParser;
