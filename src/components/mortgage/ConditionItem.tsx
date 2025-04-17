
import React, { useState } from "react";
import { CheckCircle, Clock, HelpCircle, ChevronDown, ChevronUp, Info, FileUp, Download } from "lucide-react";
import { 
  Collapsible, 
  CollapsibleTrigger, 
  CollapsibleContent 
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type ConditionStatus = "in_review" | "no_action" | "waiting_borrower" | "cleared" | "waived" | "pending" | "ready_for_download";

export interface LoanCondition {
  id?: string;
  text?: string;
  description?: string;
  status: "pending" | "cleared" | "waived";
  conditionStatus?: ConditionStatus;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  documentUrl?: string;
}

interface ConditionItemProps {
  condition: LoanCondition;
  className?: string;
  onUploadFile?: (conditionId: string | undefined, file: File) => void;
  onDownloadFile?: (conditionId: string | undefined, fileUrl: string) => void;
}

export const ConditionItem: React.FC<ConditionItemProps> = ({ 
  condition, 
  className,
  onUploadFile,
  onDownloadFile
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const conditionStatus = condition.conditionStatus || 
    (condition.status === "cleared" ? "cleared" : 
     condition.status === "waived" ? "waived" : "in_review");

  const conditionText = condition.text || condition.description || "";

  const defaultNotes = () => {
    switch (conditionStatus) {
      case "in_review":
        return "This condition is currently under review by underwriting.";
      case "no_action":
        return "No action has been taken on this condition yet.";
      case "waiting_borrower":
        return "We are waiting for the borrower to provide the required documentation.";
      case "cleared":
        return "This condition has been cleared by underwriting.";
      case "waived":
        return "This condition has been waived and is no longer required.";
      case "ready_for_download":
        return "This condition's documentation is ready for download.";
      default:
        return "This condition is pending review.";
    }
  };

  const notes = condition.notes || defaultNotes();
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && onUploadFile) {
      const file = event.target.files[0];
      onUploadFile(condition.id, file);
      toast.success(`File "${file.name}" uploaded for condition`);
    }
  };

  const handleDownload = () => {
    if (condition.fileUrl && onDownloadFile) {
      onDownloadFile(condition.id, condition.fileUrl);
      toast.success("Downloading document...");
    }
  };

  const handleDownloadLOE = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (condition.documentUrl) {
      window.open(condition.documentUrl, '_blank');
      toast.success("Opening Letter of Explanation");
    }
  };

  const getStatusInfo = () => {
    switch (conditionStatus) {
      case "in_review":
        return {
          label: "In UW Review",
          icon: <Info className="h-4 w-4 text-blue-600" />,
          color: "text-blue-600 bg-blue-50",
          description: "This condition is being reviewed by underwriting"
        };
      case "no_action":
        return {
          label: "No Action Taken",
          icon: <HelpCircle className="h-4 w-4 text-gray-600" />,
          color: "text-gray-600 bg-gray-50",
          description: "No action has been initiated on this condition"
        };
      case "waiting_borrower":
        return {
          label: "Waiting on Borrower",
          icon: <Clock className="h-4 w-4 text-amber-600" />,
          color: "text-amber-600 bg-amber-50",
          description: "Waiting for borrower to provide documentation"
        };
      case "cleared":
        return {
          label: "Cleared",
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          color: "text-green-600 bg-green-50",
          description: "This condition has been satisfied"
        };
      case "waived":
        return {
          label: "Waived",
          icon: <CheckCircle className="h-4 w-4 text-purple-600" />,
          color: "text-purple-600 bg-purple-50",
          description: "This condition has been waived"
        };
      case "ready_for_download":
        return {
          label: "Ready for Download",
          icon: <Download className="h-4 w-4 text-green-600" />,
          color: "text-green-600 bg-green-100",
          description: "Documentation is ready for download"
        };
      default:
        return {
          label: "Pending",
          icon: <Clock className="h-4 w-4 text-gray-600" />,
          color: "text-gray-600 bg-gray-50",
          description: "This condition is pending review"
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("border rounded-md overflow-hidden", className)}
    >
      <CollapsibleTrigger className="flex items-start w-full p-3 text-left hover:bg-gray-50">
        <div className="flex-1 flex items-start">
          <div className="mr-2 mt-0.5">{statusInfo.icon}</div>
          <span className="text-gray-800">{conditionText}</span>
        </div>
        <div className="flex items-center space-x-2">
          {condition.documentUrl && (
            <button 
              onClick={handleDownloadLOE}
              className="p-1 rounded-full hover:bg-gray-100"
              title="Download Letter of Explanation"
            >
              <Download className="h-4 w-4 text-blue-600" />
            </button>
          )}
          <HoverCard>
            <HoverCardTrigger asChild>
              <div className={cn("px-2 py-1 rounded-full text-xs font-medium", statusInfo.color)}>
                {statusInfo.label}
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-64">
              <p className="text-sm">{statusInfo.description}</p>
            </HoverCardContent>
          </HoverCard>
          {isOpen ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
          }
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 border-t bg-gray-50">
          <h4 className="font-medium text-sm mb-1">Notes</h4>
          <p className="text-sm text-gray-700 mb-3">{notes}</p>
          
          {condition.fileName && (
            <div className="mb-3 text-sm">
              <span className="font-medium">Attached file: </span>
              <span className="text-blue-600">{condition.fileName}</span>
              {condition.fileUrl && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="ml-2 py-0 h-6"
                  onClick={handleDownload}
                >
                  <Download className="h-3 w-3 mr-1" /> Download
                </Button>
              )}
            </div>
          )}
          
          {condition.documentUrl && (
            <div className="mb-3 text-sm">
              <span className="font-medium">Letter of Explanation: </span>
              <Button 
                variant="outline" 
                size="sm"
                className="ml-2 py-0 h-6"
                onClick={handleDownloadLOE}
              >
                <Download className="h-3 w-3 mr-1" /> View LOE
              </Button>
            </div>
          )}
          
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer text-sm text-gray-700 hover:text-gray-900 py-1 px-2 rounded border border-dashed border-gray-300 hover:border-gray-400 bg-white">
              <FileUp className="h-4 w-4 mr-1" />
              <span>Upload document</span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
