
import React, { useState } from "react";
import { CheckCircle, Clock, HelpCircle, ChevronDown, ChevronUp, Info } from "lucide-react";
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

export type ConditionStatus = "in_review" | "no_action" | "waiting_borrower" | "cleared" | "waived" | "pending";

export interface LoanCondition {
  id?: string;
  description: string;
  status: "pending" | "cleared" | "waived";
  conditionStatus?: ConditionStatus;
  notes?: string;
}

interface ConditionItemProps {
  condition: LoanCondition;
  className?: string;
}

export const ConditionItem: React.FC<ConditionItemProps> = ({ condition, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Set default condition status if not available
  const conditionStatus = condition.conditionStatus || 
    (condition.status === "cleared" ? "cleared" : 
     condition.status === "waived" ? "waived" : "in_review");

  // Generate notes based on condition status
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
      default:
        return "This condition is pending review.";
    }
  };

  // Use provided notes or default based on status
  const notes = condition.notes || defaultNotes();
  
  // Get status information
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
          <span className="text-gray-800">{condition.description}</span>
        </div>
        <div className="flex items-center space-x-2">
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
          <p className="text-sm text-gray-700">{notes}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
