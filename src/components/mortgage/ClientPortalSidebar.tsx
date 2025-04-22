import React, { useState } from "react";
import { 
  Home, 
  FileText, 
  AlertTriangle, 
  MessageCircle,
  ChevronDown,
  User,
  Briefcase,
  Wallet,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ClientPortalSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  urgentCount?: number;
  activeAppSection?: string;
  setActiveAppSection?: (section: string) => void;
  onApplicationClick?: () => void;
  leadId?: string | number; 
}

const ClientPortalSidebar = ({
  activeTab,
  setActiveTab,
  urgentCount,
  activeAppSection,
  setActiveAppSection,
  onApplicationClick,
  leadId // Get leadId from props
}: ClientPortalSidebarProps) => {
  const [isLoanAppExpanded, setIsLoanAppExpanded] = useState(false);

  const menuItems = [
    { id: 'home', icon: Home, label: 'Dashboard' },
    { id: 'application', icon: FileText, label: 'Application', isExpandable: true },
    { id: 'conditions', icon: FileText, label: 'Conditions' },
    { id: 'attention', icon: AlertTriangle, label: 'Attention' },
    { id: 'support', icon: MessageCircle, label: 'Support' },
  ];

  const loanAppSections = [
    { id: 'personal-info', label: 'Personal Information', icon: User },
    { id: 'employment-income', label: 'Employment & Income', icon: Briefcase },
    { id: 'assets', label: 'Assets', icon: Wallet },
    { id: 'liabilities', label: 'Liabilities', icon: Shield },
    { id: 'real-estate', label: 'Real Estate Owned', icon: Home },
    { id: 'loan-info', label: 'Loan Information', icon: FileText },
    { id: 'housing', label: 'Housing Expenses', icon: Home },
    { id: 'details', label: 'Details of Transaction', icon: FileText },
    { id: 'declarations', label: 'Declarations', icon: FileText },
    { id: 'monitoring', label: 'Government Monitoring', icon: Shield },
  ];

  const handleSectionClick = (sectionId: string) => {
    if (setActiveAppSection) setActiveAppSection(sectionId);
    setActiveTab("application");
    setIsLoanAppExpanded(true);
    if (onApplicationClick) {
      if (sectionId === "personal-info") {
        console.log("Personal Information section clicked, calling onApplicationClick");
      } else {
        console.log("Section clicked (subsection), calling onApplicationClick");
      }
      
      console.log("onApplicationClick is defined:", typeof onApplicationClick === 'function');
      try {
        onApplicationClick();
        console.log("onApplicationClick called successfully");
      } catch (error) {
        console.error("Error calling onApplicationClick:", error);
      }
    } else {
      console.warn("onApplicationClick is not defined for section:", sectionId);
    }
  };

  return (
    <div className="h-full">
      <Sidebar 
        className="bg-blue-600 text-white rounded-tr-3xl shadow-xl z-10 w-72 pt-6 mt-4" 
        collapsible="icon"
      >
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    {item.id === 'application' ? (
                      <div>
                        <SidebarMenuButton
                          onClick={() => {
                            setIsLoanAppExpanded(!isLoanAppExpanded);
                            if (onApplicationClick) {
                              console.log("Application clicked, explicitly firing onApplicationClick");
                              console.log("onApplicationClick is defined:", typeof onApplicationClick === 'function');
                              try {
                                onApplicationClick();
                                console.log("onApplicationClick called successfully from application button");
                              } catch (error) {
                                console.error("Error calling onApplicationClick from application button:", error);
                              }
                            } else {
                              console.warn("onApplicationClick is not defined for application tab");
                            }
                          }}
                          className={cn(
                            "relative flex items-center w-full rounded-lg transition-colors mb-1",
                            isLoanAppExpanded 
                              ? "bg-blue-500 text-white ring-2 ring-white" 
                              : "bg-white text-blue-600 hover:bg-blue-50"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="ml-3">{item.label}</span>
                          <ChevronDown 
                            className={cn(
                              "ml-auto h-4 w-4 transition-transform duration-200",
                              isLoanAppExpanded && "rotate-180"
                            )}
                          />
                        </SidebarMenuButton>
                        <div className={cn(
                          "overflow-hidden transition-all duration-300 ease-in-out",
                          isLoanAppExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                        )}>
                          <SidebarMenuSub>
                            <div className="space-y-2 py-2">
                              {loanAppSections.map((section) => (
                                <SidebarMenuSubButton
                                  key={section.id}
                                  className={cn(
                                    "flex items-center w-full text-xs pl-2 py-1.5 bg-blue-500/20 rounded-lg mx-1 backdrop-blur-sm border border-white/10 pr-1",
                                    activeAppSection === section.id && "bg-blue-700/50 ring-2 ring-white"
                                  )}
                                  onClick={() => handleSectionClick(section.id)}
                                  style={{ cursor: "pointer" }}
                                >
                                  <section.icon className="h-3 w-3 mr-2 flex-shrink-0" />
                                  <span className="whitespace-normal leading-tight flex-grow text-left">{section.label}</span>
                                </SidebarMenuSubButton>
                              ))}
                            </div>
                          </SidebarMenuSub>
                        </div>
                      </div>
                    ) : (
                      <SidebarMenuButton
                        isActive={activeTab === item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (item.id === 'home' && onApplicationClick) {
                            console.log("Dashboard clicked, firing onApplicationClick");
                            console.log("onApplicationClick is defined:", typeof onApplicationClick === 'function');
                            try {
                              onApplicationClick();
                              console.log("onApplicationClick called successfully from dashboard");
                            } catch (error) {
                              console.error("Error calling onApplicationClick from dashboard:", error);
                            }
                          }
                          if (item.id === 'application' && onApplicationClick) {
                            console.log("onApplicationClick is defined:", typeof onApplicationClick === 'function');
                            try {
                              onApplicationClick();
                              console.log("onApplicationClick called successfully from application menu item");
                            } catch (error) {
                              console.error("Error calling onApplicationClick from application menu item:", error);
                            }
                          }
                        }}
                        className={`relative flex items-center w-full rounded-lg transition-colors ${
                          activeTab === item.id 
                            ? 'bg-blue-500 text-white ring-2 ring-white' 
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="ml-3">{item.label}</span>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </div>
  );
};

export default ClientPortalSidebar;
