
import React from "react";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  DollarSign, 
  MessageSquareCode, 
  Presentation, 
  Brain, 
  FileBox, 
  FolderClosed, 
  CheckCircle, 
  XCircle 
} from "lucide-react";

interface LoanApplicationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const LoanApplicationSidebar: React.FC<LoanApplicationSidebarProps> = ({ 
  activeTab, 
  onTabChange 
}) => {
  const tabs = [
    { id: "1003", name: "1003", icon: FileText },
    { id: "products", name: "Products & Pricing", icon: DollarSign },
    { id: "processor", name: "Processor Assist", icon: MessageSquareCode },
    { id: "pitchDeck", name: "Pitch Deck Pro", icon: Presentation },
    { id: "aiLoanOfficer", name: "AI Loan Officer", icon: Brain },
    { id: "fees", name: "Fees", icon: FileBox },
    { id: "documents", name: "Document Manager", icon: FolderClosed },
    { id: "conditions", name: "Conditions", icon: CheckCircle },
    { id: "withdraw", name: "Withdraw / Cancel", icon: XCircle },
  ];

  return (
    <div className="w-64 h-full bg-white border-r shadow-sm flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg text-mortgage-darkPurple">Loan Application</h2>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <li key={tab.id}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex items-center w-full px-4 py-3 text-left text-sm transition-colors",
                    isActive 
                      ? "bg-mortgage-lightPurple text-mortgage-darkPurple font-medium border-r-4 border-mortgage-purple" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-mortgage-purple" : "text-gray-500")} />
                  <span>{tab.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default LoanApplicationSidebar;
