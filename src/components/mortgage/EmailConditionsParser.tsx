
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Mail, FileType, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from '@/context/AuthContext';

interface LoanCondition {
  description: string;
  status: "pending" | "cleared" | "waived";
}

interface ConditionsData {
  masterConditions: LoanCondition[];
  generalConditions: LoanCondition[];
  priorToFinalConditions: LoanCondition[];
  complianceConditions: LoanCondition[];
}

interface EmailConditionsParserProps {
  borrowerLastName: string;
  loanId: string;
  onConditionsLoaded: (conditions: ConditionsData) => void;
}

const EmailConditionsParser: React.FC<EmailConditionsParserProps> = ({
  borrowerLastName,
  loanId,
  onConditionsLoaded
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchApprovalEmails = async () => {
    if (!user?.id) {
      toast.error("You need to be logged in to search emails");
      return;
    }

    setIsSearching(true);
    setError(null);
    setEmails([]);

    try {
      const { data, error } = await supabase.functions.invoke('search-approval-emails', {
        body: {
          userId: user.id,
          lastName: borrowerLastName,
          loanNumber: loanId
        }
      });

      if (error) {
        console.error("Error searching approval emails:", error);
        toast.error("Failed to search emails");
        setError("Failed to search emails. Please ensure your Gmail account is connected.");
        return;
      }

      if (!data.success) {
        toast.error(data.error || "Failed to search emails");
        setError(data.error || "An unknown error occurred while searching emails");
        return;
      }

      if (data.emails.length === 0) {
        toast.info("No approval emails found with PDF attachments");
        setError("No approval emails found. Try searching with different keywords or check your Gmail connection.");
        return;
      }

      setEmails(data.emails);
      toast.success(`Found ${data.emails.length} potential approval emails`);
    } catch (error) {
      console.error("Error in searchApprovalEmails:", error);
      toast.error("An unexpected error occurred");
      setError("An unexpected error occurred while searching emails");
    } finally {
      setIsSearching(false);
    }
  };

  const parseSelectedAttachment = async () => {
    if (!selectedEmailId || !selectedAttachmentId || !user?.id) {
      toast.error("Please select an email and attachment first");
      return;
    }

    setIsParsing(true);
    setError(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('parse-approval-document', {
        body: {
          userId: user.id,
          messageId: selectedEmailId,
          attachmentId: selectedAttachmentId
        }
      });

      if (error) {
        console.error("Error parsing approval document:", error);
        toast.error("Failed to parse document");
        setError("Failed to parse the attachment. Please try another document.");
        return;
      }

      if (!data.success) {
        toast.error(data.error || "Failed to parse document");
        setError(data.error || "An unknown error occurred while parsing the document");
        return;
      }

      onConditionsLoaded(data.conditions);
      toast.success("Successfully extracted conditions from approval document");
    } catch (error) {
      console.error("Error in parseSelectedAttachment:", error);
      toast.error("An unexpected error occurred");
      setError("An unexpected error occurred while parsing the document");
    } finally {
      setIsParsing(false);
      setIsLoading(false);
    }
  };

  const handleSelectEmail = (emailId: string) => {
    setSelectedEmailId(emailId);
    setSelectedAttachmentId(null);
  };

  const handleSelectAttachment = (attachmentId: string) => {
    setSelectedAttachmentId(attachmentId);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-blue-900 rounded-lg p-6 text-white mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Import Conditions from Approval Letter</h2>
        <Button 
          onClick={searchApprovalEmails}
          disabled={isSearching || isParsing}
          className="bg-blue-700 hover:bg-blue-600 text-white"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Search Email for Approval Letter
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-blue-800 p-4 rounded-lg mb-4 text-white">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {emails.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-blue-300">
            Select an email with an approval letter PDF attachment:
          </p>
          <div className="grid grid-cols-1 gap-4">
            {emails.map(email => (
              <div 
                key={email.id}
                className={`bg-blue-800 rounded-lg p-4 cursor-pointer transition-all border-2 
                  ${selectedEmailId === email.id ? 'border-white' : 'border-transparent'}`}
                onClick={() => handleSelectEmail(email.id)}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{email.subject}</h3>
                  <span className="text-xs text-blue-300">{formatDate(email.date)}</span>
                </div>
                <p className="text-sm text-blue-300 mt-1">{email.from}</p>
                <p className="text-sm mt-2 line-clamp-2">{email.snippet}</p>
                
                {selectedEmailId === email.id && email.attachments.length > 0 && (
                  <div className="mt-3 bg-blue-900 rounded p-3">
                    <p className="text-sm text-blue-300 mb-2">Select an attachment:</p>
                    <div className="space-y-2">
                      {email.attachments.map((attachment: any) => (
                        <div 
                          key={attachment.id}
                          className={`flex items-center p-2 rounded-md cursor-pointer 
                            ${selectedAttachmentId === attachment.id ? 'bg-blue-700' : 'bg-blue-800 hover:bg-blue-700'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAttachment(attachment.id);
                          }}
                        >
                          <FileType className="h-5 w-5 mr-2 text-blue-300" />
                          <span>{attachment.filename}</span>
                          {selectedAttachmentId === attachment.id && (
                            <CheckCircle className="h-4 w-4 ml-2 text-green-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex justify-end mt-4">
            <Button 
              onClick={parseSelectedAttachment}
              disabled={!selectedAttachmentId || isParsing}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing Document...
                </>
              ) : (
                <>
                  <FileType className="mr-2 h-4 w-4" />
                  Extract Conditions
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-blue-300">Processing approval document...</p>
            <p className="text-sm text-blue-400 mt-2">This may take a minute depending on the document size</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailConditionsParser;
