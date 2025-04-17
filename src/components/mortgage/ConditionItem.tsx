
import React from "react";
import { Check, Loader2, FileText } from "lucide-react";
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
  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100">
      <div className="flex-1">
        <p className="text-sm text-blue-900">{condition.text}</p>
        {condition.documentUrl && (
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto text-blue-600 hover:text-blue-800"
            asChild
          >
            <a 
              href={condition.documentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center mt-1"
            >
              <FileText className="h-3 w-3 mr-1" />
              View LOE
            </a>
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
