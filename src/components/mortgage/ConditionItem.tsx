
import React from "react";
import { Check, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface LoanCondition {
  id?: string;
  text: string;
  status?: string;
  documentUrl?: string;
  isProcessing?: boolean;
  isCompleted?: boolean;
}

export const ConditionItem: React.FC<{ condition: LoanCondition }> = ({ condition }) => {
  const handleDownload = (url: string) => {
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `LOE_${condition.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100">
      <div className="flex-1">
        <p className="text-sm text-blue-900">{condition.text}</p>
        {condition.documentUrl && (
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto text-blue-600 hover:text-blue-800"
            onClick={() => handleDownload(condition.documentUrl!)}
          >
            <Download className="h-3 w-3 mr-1" />
            Download LOE
          </Button>
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
