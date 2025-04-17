
import React from "react";
import { Button } from "@/components/ui/button";
import { PenLine, FileText, ExternalLink } from "lucide-react";
import { LoanProgressUpdate } from "./LoanProgressUpdate";

interface ProcessorActionHeaderProps {
  leadId: string | number;
  loanId: string;
  borrowerName: string;
  onRefresh?: () => void;
}

export function ProcessorActionHeader({
  leadId,
  loanId,
  borrowerName,
  onRefresh
}: ProcessorActionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b">
      <div>
        <h3 className="text-lg font-semibold text-blue-800">
          {loanId} - {borrowerName}
        </h3>
      </div>
      <div className="flex gap-2 flex-wrap">
        <LoanProgressUpdate 
          leadId={leadId}
          onUpdate={onRefresh}
          buttonText="Update Status" 
          buttonVariant="secondary"
          buttonSize="sm"
        />
        
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-1" />
          Add Note
        </Button>
        
        <Button variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-1" />
          View Application
        </Button>
      </div>
    </div>
  );
}
