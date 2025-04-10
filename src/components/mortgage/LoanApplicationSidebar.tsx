
import React, { useState } from "react";
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
  XCircle,
  ChevronDown,
  ChevronRight,
  User,
  Briefcase,
  Wallet,
  HandshakeIcon,
  Home,
  Info,
  Utensils,
  Flag,
  Shield
} from "lucide-react";

interface LoanApplicationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const LoanApplicationSidebar: React.FC<LoanApplicationSidebarProps> = ({ 
  activeTab, 
  onTabChange 
}) => {
  const [is1003Expanded, setIs1003Expanded] = useState(false);

  const toggle1003Menu = () => {
    setIs1003Expanded(!is1003Expanded);
  };

  const form1003Sections = [
    { id: "personal", name: "Personal Information", icon: User },
    { id: "employment", name: "Employment & Income", icon: Briefcase },
    { id: "assets", name: "Assets", icon: Wallet },
    { id: "liabilities", name: "Liabilities", icon: HandshakeIcon },
    { id: "realEstate", name: "Real Estate Owned", icon: Home },
    { id: "loanInfo", name: "Loan Information", icon: Info },
    { id: "housing", name: "Housing Expenses", icon: Utensils },
    { id: "transaction", name: "Details of Transaction", icon: FileText },
    { id: "declarations", name: "Declarations", icon: Flag },
    { id: "government", name: "Government Monitoring", icon: Shield }
  ];

  const mainTabs = [
    { id: "1003", name: "1003", icon: FileText, hasSubmenu: true },
    { id: "products", name: "Products & Pricing", icon: DollarSign },
    { id: "processor", name: "Processor Assist", icon: MessageSquareCode },
    { id: "pitchDeck", name: "Pitch Deck Pro", icon: Presentation },
    { id: "aiLoanOfficer", name: "AI Loan Officer", icon: Brain },
    { id: "fees", name: "Fees", icon: FileBox },
    { id: "documents", name: "Document Manager", icon: FolderClosed },
    { id: "conditions", name: "Conditions", icon: CheckCircle },
    { id: "withdraw", name: "Withdraw / Cancel", icon: XCircle },
  ];

  // Helper to check if a form section is active
  const isFormSectionActive = (sectionId: string) => {
    return activeTab === `1003-${sectionId}`;
  };

  return (
    <div className="w-64 h-full bg-white border-r shadow-sm flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg text-mortgage-darkPurple">Loan Application</h2>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1">
          {mainTabs.map((tab) => {
            const isActive = tab.id === "1003" 
              ? activeTab.startsWith("1003") 
              : activeTab === tab.id;
            
            const Icon = tab.icon;
            
            // For the 1003 tab with submenu
            if (tab.id === "1003") {
              return (
                <React.Fragment key={tab.id}>
                  <li>
                    <button
                      onClick={toggle1003Menu}
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-3 text-left text-sm transition-colors",
                        isActive 
                          ? "bg-mortgage-lightPurple text-mortgage-darkPurple font-medium border-r-4 border-mortgage-purple" 
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <div className="flex items-center">
                        <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-mortgage-purple" : "text-gray-500")} />
                        <span>{tab.name}</span>
                      </div>
                      {is1003Expanded ? 
                        <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      }
                    </button>
                  </li>
                  {/* Submenu for 1003 form sections */}
                  <div 
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out pl-8",
                      is1003Expanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <ul className="space-y-1 py-1">
                      {form1003Sections.map(section => (
                        <li key={section.id}>
                          <button
                            onClick={() => onTabChange(`1003-${section.id}`)}
                            className={cn(
                              "flex items-center w-full px-4 py-2 text-left text-sm transition-colors rounded-md",
                              isFormSectionActive(section.id)
                                ? "bg-mortgage-lightPurple/60 text-mortgage-darkPurple font-medium" 
                                : "text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            <section.icon className={cn(
                              "mr-2 h-4 w-4",
                              isFormSectionActive(section.id) ? "text-mortgage-purple" : "text-gray-500"
                            )} />
                            <span>{section.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </React.Fragment>
              );
            }
            
            // For other tabs without submenu
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
