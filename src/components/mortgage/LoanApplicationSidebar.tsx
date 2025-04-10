
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
  Coins,
  CreditCard,
  Home,
  Landmark,
  Building,
  ClipboardList,
  FileQuestion,
  ShieldCheck
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface LoanApplicationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const LoanApplicationSidebar: React.FC<LoanApplicationSidebarProps> = ({ 
  activeTab, 
  onTabChange 
}) => {
  const [is1003Open, setIs1003Open] = useState(false);

  const form1003Sections = [
    { id: "personalInfo", name: "Personal Information", icon: User },
    { id: "employment", name: "Employment & Income", icon: Briefcase },
    { id: "assets", name: "Assets", icon: Coins },
    { id: "liabilities", name: "Liabilities", icon: CreditCard },
    { id: "realEstate", name: "Real Estate Owned", icon: Home },
    { id: "loanInfo", name: "Loan Information", icon: Landmark },
    { id: "housingExpenses", name: "Housing Expenses", icon: Building },
    { id: "transaction", name: "Details of Transaction", icon: ClipboardList },
    { id: "declarations", name: "Declarations", icon: FileQuestion },
    { id: "monitoring", name: "Government Monitoring", icon: ShieldCheck }
  ];

  const mainTabs = [
    { id: "1003", name: "1003", icon: FileText, hasChildren: true },
    { id: "products", name: "Products & Pricing", icon: DollarSign },
    { id: "processor", name: "Processor Assist", icon: MessageSquareCode },
    { id: "pitchDeck", name: "Pitch Deck Pro", icon: Presentation },
    { id: "aiLoanOfficer", name: "AI Loan Officer", icon: Brain },
    { id: "fees", name: "Fees", icon: FileBox },
    { id: "documents", name: "Document Manager", icon: FolderClosed },
    { id: "conditions", name: "Conditions", icon: CheckCircle },
    { id: "withdraw", name: "Withdraw / Cancel", icon: XCircle },
  ];

  const handleMainTabClick = (tabId: string) => {
    if (tabId === "1003") {
      setIs1003Open(!is1003Open);
      // Only change the active tab if we're collapsing or if it's the first time opening
      if (!is1003Open && !activeTab.startsWith("1003:")) {
        onTabChange("1003:personalInfo");
      }
    } else {
      onTabChange(tabId);
    }
  };

  const handle1003SectionClick = (sectionId: string) => {
    onTabChange(`1003:${sectionId}`);
  };

  return (
    <div className="w-64 h-full bg-white border-r shadow-sm flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg text-mortgage-darkPurple">Loan Application</h2>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1">
          {mainTabs.map((tab) => {
            const isMainActive = tab.id === "1003" ? 
              activeTab.startsWith("1003:") || activeTab === "1003" : 
              activeTab === tab.id;
            const Icon = tab.icon;
            
            if (tab.id === "1003" && tab.hasChildren) {
              return (
                <li key={tab.id} className="mb-1">
                  <Collapsible
                    open={is1003Open}
                    onOpenChange={setIs1003Open}
                    className="w-full"
                  >
                    <CollapsibleTrigger className="w-full">
                      <button
                        onClick={() => handleMainTabClick(tab.id)}
                        className={cn(
                          "flex items-center w-full px-4 py-3 text-left text-sm transition-colors",
                          isMainActive 
                            ? "bg-mortgage-lightPurple text-mortgage-darkPurple font-medium" 
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <Icon className={cn("mr-3 h-5 w-5", isMainActive ? "text-mortgage-purple" : "text-gray-500")} />
                        <span>{tab.name}</span>
                        {is1003Open ? (
                          <ChevronDown className="ml-auto h-4 w-4" />
                        ) : (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-10 space-y-1 animate-accordion-down">
                      {form1003Sections.map((section) => {
                        const isSectionActive = activeTab === `1003:${section.id}`;
                        const SectionIcon = section.icon;
                        
                        return (
                          <button
                            key={section.id}
                            onClick={() => handle1003SectionClick(section.id)}
                            className={cn(
                              "flex items-center w-full px-3 py-2 text-left text-sm transition-colors rounded-r-md",
                              isSectionActive 
                                ? "bg-mortgage-lightPurple/60 text-mortgage-darkPurple font-medium border-l-2 border-mortgage-purple"
                                : "text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            <SectionIcon className={cn("mr-2 h-4 w-4", isSectionActive ? "text-mortgage-purple" : "text-gray-500")} />
                            <span className="text-sm">{section.name}</span>
                          </button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            }
            
            return (
              <li key={tab.id}>
                <button
                  onClick={() => handleMainTabClick(tab.id)}
                  className={cn(
                    "flex items-center w-full px-4 py-3 text-left text-sm transition-colors",
                    isMainActive 
                      ? "bg-mortgage-lightPurple text-mortgage-darkPurple font-medium border-r-4 border-mortgage-purple" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Icon className={cn("mr-3 h-5 w-5", isMainActive ? "text-mortgage-purple" : "text-gray-500")} />
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
