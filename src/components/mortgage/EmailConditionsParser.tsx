import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, FileText, Info, AlertCircle, Save, RefreshCcw } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConditionItem, LoanCondition, ConditionStatus } from './ConditionItem';

interface ParsedConditions {
  masterConditions: LoanCondition[];
  generalConditions: LoanCondition[];
  priorToFinalConditions: LoanCondition[];
  complianceConditions: LoanCondition[];
}

interface EmailConditionsParserProps {
  clientLastName: string;
  loanNumber: string;
  leadId?: string | number;
  onConditionsFound?: (conditions: ParsedConditions) => void;
}

const EmailConditionsParser: React.FC<EmailConditionsParserProps> = ({
  clientLastName,
  loanNumber: initialLoanNumber,
  leadId,
  onConditionsFound
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [foundEmails, setFoundEmails] = useState<any[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{code: string, message: string, details?: any} | null>(null);
  const [loanNumber, setLoanNumber] = useState(initialLoanNumber || '');
  const [emailSender, setEmailSender] = useState<string>('');

  useEffect(() => {
    if (leadId) {
      fetchExistingConditions(leadId.toString());
    }
  }, [leadId]);

  const fetchExistingConditions = async (leadId: string) => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      console.log(`Fetching existing conditions for lead ID: ${leadId}`);
      const { data, error } = await supabase.functions.invoke(`retrieve-conditions?leadId=${leadId}`, {
        body: {}
      });
      
      if (error) {
        console.error("Error retrieving conditions:", error);
        toast.error("Failed to retrieve loan conditions");
        setLastError({
          code: 'FUNCTION_ERROR',
          message: "Failed to invoke retrieve-conditions function",
          details: error
        });
        return;
      }

      if (data.success && data.conditions) {
        
        if (onConditionsFound) {
          onConditionsFound(data.conditions);
        }
        
        toast.success("Successfully retrieved loan conditions");
        console.log("Retrieved conditions:", data.conditions);
      } else if (data.success && !data.conditions) {
        console.log("No existing conditions found for lead ID:", leadId);
      } else {
        const errorMessage = data.error || "Failed to retrieve loan conditions";
        toast.error(errorMessage);
        setLastError({
          code: data.code || 'UNKNOWN_ERROR',
          message: errorMessage,
          details: data.details || {}
        });
      }
    } catch (err: any) {
      console.error("Error in fetchExistingConditions:", err);
      toast.error("An unexpected error occurred");
      setLastError({
        code: 'UNEXPECTED_ERROR',
        message: err.message || "An unexpected error occurred",
        details: err
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveConditions = async () => {
    if (!leadId) {
      toast.error("Missing lead ID");
      return;
    }
    
    setIsSaving(true);
    setLastError(null);
    
    try {
      console.log(`Saving conditions for lead ID: ${leadId}`);
      const { data, error } = await supabase.functions.invoke('update-conditions', {
        body: { 
          leadId,
          conditions: onConditionsFound
        }
      });
      
      if (error) {
        console.error("Error saving conditions:", error);
        toast.error("Failed to save loan conditions");
        setLastError({
          code: 'FUNCTION_ERROR',
          message: "Failed to invoke update-conditions function",
          details: error
        });
        return;
      }

      if (data.success) {
        toast.success("Successfully saved loan conditions");
        console.log("Saved conditions:", data);
      } else {
        const errorMessage = data.error || "Failed to save loan conditions";
        toast.error(errorMessage);
        setLastError({
          code: data.code || 'UNKNOWN_ERROR',
          message: errorMessage,
          details: data.details || {}
        });
      }
    } catch (err: any) {
      console.error("Error in saveConditions:", err);
      toast.error("An unexpected error occurred");
      setLastError({
        code: 'UNEXPECTED_ERROR',
        message: err.message || "An unexpected error occurred",
        details: err
      });
    } finally {
      setIsSaving(false);
    }
  };

  const searchEmails = async () => {
    setIsSearching(true);
    setFoundEmails([]);
    setSelectedEmailId(null);
    setSelectedAttachmentId(null);
    setSearchQuery(null);
    setLastError(null);
    
    try {
      console.log('Searching for approval emails with:', { clientLastName, loanNumber, emailSender });
      const { data, error } = await supabase.functions.invoke('search-approval-emails', {
        body: { 
          clientLastName,
          loanNumber,
          emailSender: emailSender.trim() || undefined
        }
      });
      
      if (error) {
        console.error("Error searching emails:", error);
        toast.error("Failed to search emails");
        setLastError({
          code: 'FUNCTION_ERROR',
          message: "Failed to invoke search-approval-emails function",
          details: error
        });
        return;
      }

      if (data.query) {
        setSearchQuery(data.query);
      }

      if (data.success && data.emails) {
        setFoundEmails(data.emails);
        
        if (data.emails.length === 0) {
          toast.info("No approval emails found matching the search criteria. Try broadening your search terms.");
          console.log("Search completed - no approval emails found");
        } else {
          toast.success(`Found ${data.emails.length} potential approval emails`);
          console.log(`Search completed - found ${data.emails.length} emails with PDF attachments`);
        }
      } else {
        const errorMessage = data.error || "Failed to search emails";
        toast.error(errorMessage);
        setLastError({
          code: data.code || 'UNKNOWN_ERROR',
          message: errorMessage,
          details: data.details || {}
        });
        console.error("Search failed:", data);
      }
    } catch (err: any) {
      console.error("Error in searchEmails:", err);
      toast.error("An unexpected error occurred");
      setLastError({
        code: 'UNEXPECTED_ERROR',
        message: err.message || "An unexpected error occurred",
        details: err
      });
    } finally {
      setIsSearching(false);
    }
  };

  const parseDocument = async (emailId: string, attachmentId: string) => {
    setSelectedEmailId(emailId);
    setSelectedAttachmentId(attachmentId);
    setIsParsing(true);
    setLastError(null);
    
    try {
      console.log(`Parsing document from email ${emailId}, attachment ${attachmentId}`);
      const { data, error } = await supabase.functions.invoke('parse-approval-document', {
        body: { 
          emailId,
          attachmentId
        }
      });
      
      if (error) {
        console.error("Error parsing document:", error);
        toast.error("Failed to parse document");
        setLastError({
          code: 'FUNCTION_ERROR',
          message: "Failed to invoke parse-approval-document function",
          details: error
        });
        return;
      }

      if (data.success && data.conditions) {
        const enhancedConditions = processConditionsWithStatus(data.conditions);
        
        if (onConditionsFound) {
          onConditionsFound(enhancedConditions);
        }
        
        toast.success("Successfully extracted conditions from document");
        console.log("Document parsed successfully:", enhancedConditions);
      } else {
        const errorMessage = data.error || "Failed to parse conditions from document";
        toast.error(errorMessage);
        setLastError({
          code: data.code || 'UNKNOWN_ERROR',
          message: errorMessage,
          details: data.details || {}
        });
        console.error("Parsing failed:", data);
      }
    } catch (err: any) {
      console.error("Error in parseDocument:", err);
      toast.error("An unexpected error occurred");
      setLastError({
        code: 'UNEXPECTED_ERROR',
        message: err.message || "An unexpected error occurred",
        details: err
      });
    } finally {
      setIsParsing(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  const assignRandomStatuses = (conditions: LoanCondition[]): LoanCondition[] => {
    const statuses: ConditionStatus[] = 
      ["in_review", "no_action", "waiting_borrower", "cleared", "waived", "ready_for_download"];
    
    return conditions.map((condition) => {
      if (condition.status === "cleared") {
        return {
          ...condition,
          conditionStatus: "cleared" as ConditionStatus,
          notes: "This condition has been reviewed and cleared by the underwriter."
        };
      }
      
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      let notes = "";
      
      switch (randomStatus) {
        case "in_review":
          notes = "Underwriter is currently reviewing the submitted documentation.";
          break;
        case "no_action":
          notes = "This condition has not been addressed yet.";
          break;
        case "waiting_borrower":
          notes = "We have requested additional documentation from the borrower on " +
            new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toLocaleDateString();
          break;
        case "cleared":
          notes = "Condition was cleared on " +
            new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000)).toLocaleDateString();
          break;
        case "waived":
          notes = "This condition was waived by the underwriter due to compensating factors.";
          break;
        case "ready_for_download":
          notes = "Documentation has been uploaded and is ready for download.";
          break;
      }
      
      return {
        ...condition,
        id: condition.id || `condition-${Math.random().toString(36).substr(2, 9)}`,
        conditionStatus: randomStatus,
        notes,
        fileName: randomStatus === "ready_for_download" ? "document.pdf" : undefined,
        fileUrl: randomStatus === "ready_for_download" ? "#" : undefined
      };
    });
  };

  const processConditionsWithStatus = (parsedConditions: ParsedConditions): ParsedConditions => {
    return {
      masterConditions: assignRandomStatuses(parsedConditions.masterConditions),
      generalConditions: assignRandomStatuses(parsedConditions.generalConditions),
      priorToFinalConditions: assignRandomStatuses(parsedConditions.priorToFinalConditions),
      complianceConditions: assignRandomStatuses(parsedConditions.complianceConditions)
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-blue-800">Email Conditions Parser</h2>
        <div className="flex space-x-2">
          {leadId && (
            <>
              <Button 
                onClick={() => fetchExistingConditions(leadId.toString())} 
                disabled={isLoading}
                variant="outline"
                className="bg-white hover:bg-gray-50 border-blue-400 text-blue-700"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                ) : (
                  <><RefreshCcw className="mr-2 h-4 w-4" /> Refresh Conditions</>
                )}
              </Button>
              
              <Button 
                onClick={saveConditions} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Conditions</>
                )}
              </Button>
            </>
          )}
          
          <Button 
            onClick={searchEmails} 
            disabled={isSearching}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSearching ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching Emails</>
            ) : (
              <><Search className="mr-2 h-4 w-4" /> Search Approval Emails</>
            )}
          </Button>
        </div>
      </div>
      
      <div className="bg-white border border-blue-200 p-4 rounded-md">
        <h3 className="font-medium mb-4 flex items-center text-blue-800">
          <Info className="h-4 w-4 mr-1" /> Search Parameters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="clientLastName" className="text-blue-700">Client Last Name</Label>
            <Input 
              id="clientLastName" 
              value={clientLastName} 
              disabled 
              className="bg-gray-50 text-gray-600"
            />
          </div>
          <div>
            <Label htmlFor="loanNumber" className="text-blue-700">Loan Number</Label>
            <Input 
              id="loanNumber" 
              value={loanNumber} 
              onChange={e => setLoanNumber(e.target.value)} 
              className="border-blue-200 focus:border-blue-400"
              placeholder="Enter loan number"
            />
          </div>
          <div>
            <Label htmlFor="emailSender" className="text-blue-700">Email Sender Contains</Label>
            <Input 
              id="emailSender" 
              value={emailSender} 
              onChange={e => setEmailSender(e.target.value)} 
              placeholder="e.g. underwriting@bank.com"
              className="border-blue-200 focus:border-blue-400"
            />
          </div>
        </div>
        {searchQuery && (
          <div className="mt-4 pt-3 border-t border-blue-200">
            <span className="font-medium text-sm text-blue-700">Gmail Search Query:</span> 
            <code className="ml-2 p-1 bg-blue-50 rounded text-blue-700 text-xs">{searchQuery}</code>
          </div>
        )}
      </div>
      
      {lastError && (
        <Alert variant="destructive" className="text-red-800 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-red-800">Error: {lastError.code}</AlertTitle>
          <AlertDescription>
            <p>{lastError.message}</p>
            {lastError.details && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-medium">Technical Details</summary>
                <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto max-h-40">
                  {JSON.stringify(lastError.details, null, 2)}
                </pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {foundEmails.length > 0 && (
        <Card className="bg-white border border-blue-200">
          <CardHeader className="bg-blue-50 pb-2">
            <CardTitle className="text-lg font-medium text-blue-900">
              Found {foundEmails.length} Potential Approval Emails
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 bg-white">
            <div className="space-y-3">
              {foundEmails.map((email) => (
                <div key={email.id} className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">{email.subject}</h4>
                      <p className="text-sm text-blue-700">From: {email.from}</p>
                      <p className="text-xs text-blue-600">Date: {formatDate(email.date)}</p>
                      <p className="text-sm mt-2 text-blue-800">{email.snippet}...</p>
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      {email.attachments.map((attachment: any) => (
                        <Button 
                          key={attachment.id}
                          size="sm"
                          onClick={() => parseDocument(email.id, attachment.id)}
                          disabled={isParsing && selectedEmailId === email.id && selectedAttachmentId === attachment.id}
                          variant="outline"
                          className="flex items-center space-x-2 border-blue-400 text-blue-800"
                        >
                          {isParsing && selectedEmailId === email.id && selectedAttachmentId === attachment.id ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> <span>Parsing...</span></>
                          ) : (
                            <><FileText className="h-3 w-3" /> <span>{attachment.filename}</span></>
                          )}
                        </Button>
                      ))}
                      <p className="text-xs text-blue-600 mt-1">
                        {email.attachments.length} PDF attachment(s)
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {!isSearching && foundEmails.length === 0 && (
        <Card className="bg-white border border-blue-100">
          <CardContent className="p-6 text-center">
            <Search className="mx-auto h-12 w-12 text-blue-300 mb-3" />
            <h3 className="text-lg font-medium text-blue-800 mb-2">No Email Search Results</h3>
            <p className="text-blue-600">
              Click "Search Approval Emails" to find and parse approval documents for this borrower.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailConditionsParser;
