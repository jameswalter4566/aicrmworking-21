
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LoanCondition {
  description: string;
  status: "pending" | "cleared" | "waived";
}

interface ParsedConditions {
  masterConditions: LoanCondition[];
  generalConditions: LoanCondition[];
  priorToFinalConditions: LoanCondition[];
  complianceConditions: LoanCondition[];
}

interface EmailConditionsParserProps {
  clientLastName: string;
  loanNumber: string;
  onConditionsFound?: (conditions: ParsedConditions) => void;
}

const EmailConditionsParser: React.FC<EmailConditionsParserProps> = ({
  clientLastName,
  loanNumber,
  onConditionsFound
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [foundEmails, setFoundEmails] = useState<any[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [conditions, setConditions] = useState<ParsedConditions | null>(null);

  const searchEmails = async () => {
    setIsSearching(true);
    setFoundEmails([]);
    setSelectedEmailId(null);
    setSelectedAttachmentId(null);
    setConditions(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-approval-emails', {
        body: { 
          clientLastName,
          loanNumber
        }
      });
      
      if (error) {
        console.error("Error searching emails:", error);
        toast.error("Failed to search emails");
        return;
      }

      if (data.success && data.emails) {
        setFoundEmails(data.emails);
        
        if (data.emails.length === 0) {
          toast.info("No approval emails found matching the search criteria");
        } else {
          toast.success(`Found ${data.emails.length} potential approval emails`);
        }
      } else {
        toast.error(data.error || "Failed to search emails");
      }
    } catch (err) {
      console.error("Error in searchEmails:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSearching(false);
    }
  };

  const parseDocument = async (emailId: string, attachmentId: string) => {
    setSelectedEmailId(emailId);
    setSelectedAttachmentId(attachmentId);
    setIsParsing(true);
    setConditions(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-approval-document', {
        body: { 
          emailId,
          attachmentId
        }
      });
      
      if (error) {
        console.error("Error parsing document:", error);
        toast.error("Failed to parse document");
        return;
      }

      if (data.success && data.conditions) {
        setConditions(data.conditions);
        
        if (onConditionsFound) {
          onConditionsFound(data.conditions);
        }
        
        toast.success("Successfully extracted conditions from document");
      } else {
        toast.error(data.error || "Failed to parse conditions from document");
      }
    } catch (err) {
      console.error("Error in parseDocument:", err);
      toast.error("An unexpected error occurred");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-orange-800">Email Conditions Parser</h2>
        <Button 
          onClick={searchEmails} 
          disabled={isSearching}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {isSearching ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching Emails</>
          ) : (
            <><Search className="mr-2 h-4 w-4" /> Search Approval Emails</>
          )}
        </Button>
      </div>
      
      {foundEmails.length > 0 && (
        <Card className="bg-orange-100">
          <CardHeader className="bg-orange-200 pb-2">
            <CardTitle className="text-lg font-medium text-orange-900">
              Found {foundEmails.length} Potential Approval Emails
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 bg-orange-100">
            <div className="space-y-3">
              {foundEmails.map((email) => (
                <div key={email.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-orange-900">{email.subject}</h4>
                      <p className="text-sm text-orange-700">From: {email.from}</p>
                      <p className="text-xs text-orange-600">Date: {formatDate(email.date)}</p>
                      <p className="text-sm mt-2 text-orange-800">{email.snippet}...</p>
                    </div>
                    <div className="ml-4">
                      {email.attachments.map((attachment: any) => (
                        <Button 
                          key={attachment.id}
                          size="sm"
                          onClick={() => parseDocument(email.id, attachment.id)}
                          disabled={isParsing && selectedEmailId === email.id && selectedAttachmentId === attachment.id}
                          variant="outline"
                          className="flex items-center space-x-2 border-orange-400 text-orange-800"
                        >
                          {isParsing && selectedEmailId === email.id && selectedAttachmentId === attachment.id ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> <span>Parsing...</span></>
                          ) : (
                            <><FileText className="h-3 w-3" /> <span>Parse {attachment.filename}</span></>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {conditions && (
        <div className="grid grid-cols-1 gap-6">
          {/* Master Conditions */}
          <Card className="bg-orange-100">
            <CardHeader className="bg-orange-200 pb-2">
              <CardTitle className="text-lg font-medium text-orange-900">Master Conditions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 bg-orange-100">
              {conditions.masterConditions.length > 0 ? (
                <ul className="space-y-2">
                  {conditions.masterConditions.map((condition, index) => (
                    <li key={index} className="flex items-start">
                      <div className="mr-2 mt-0.5">
                        {condition.status === "cleared" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                      <span className="text-orange-800">{condition.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-orange-800 italic">
                  No master conditions found in the document.
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* General Conditions */}
          <Card className="bg-orange-100">
            <CardHeader className="bg-orange-200 pb-2">
              <CardTitle className="text-lg font-medium text-orange-900">General Conditions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 bg-orange-100">
              {conditions.generalConditions.length > 0 ? (
                <ul className="space-y-2">
                  {conditions.generalConditions.map((condition, index) => (
                    <li key={index} className="flex items-start">
                      <div className="mr-2 mt-0.5">
                        {condition.status === "cleared" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                      <span className="text-orange-800">{condition.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-orange-800 italic">
                  No general conditions found in the document.
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Prior to Final Conditions */}
          <Card className="bg-orange-100">
            <CardHeader className="bg-orange-200 pb-2">
              <CardTitle className="text-lg font-medium text-orange-900">Prior to Final Conditions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 bg-orange-100">
              {conditions.priorToFinalConditions.length > 0 ? (
                <ul className="space-y-2">
                  {conditions.priorToFinalConditions.map((condition, index) => (
                    <li key={index} className="flex items-start">
                      <div className="mr-2 mt-0.5">
                        {condition.status === "cleared" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                      <span className="text-orange-800">{condition.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-orange-800 italic">
                  No prior to final conditions found in the document.
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Compliance Conditions */}
          <Card className="bg-orange-100">
            <CardHeader className="bg-orange-200 pb-2">
              <CardTitle className="text-lg font-medium text-orange-900">Compliance Conditions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 bg-orange-100">
              {conditions.complianceConditions.length > 0 ? (
                <ul className="space-y-2">
                  {conditions.complianceConditions.map((condition, index) => (
                    <li key={index} className="flex items-start">
                      <div className="mr-2 mt-0.5">
                        {condition.status === "cleared" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                      <span className="text-orange-800">{condition.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-orange-800 italic">
                  No compliance conditions found in the document.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {!isSearching && foundEmails.length === 0 && (
        <Card className="bg-orange-50">
          <CardContent className="p-6 text-center">
            <Search className="mx-auto h-12 w-12 text-orange-300 mb-3" />
            <h3 className="text-lg font-medium text-orange-800 mb-2">No Email Search Results</h3>
            <p className="text-orange-600">
              Click "Search Approval Emails" to find and parse approval documents for this borrower.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailConditionsParser;
