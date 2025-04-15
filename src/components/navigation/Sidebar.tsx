import React, { useState } from "react";
import { 
  Users, Inbox, ListTodo, Calendar, 
  BarChart2, Settings, Home, DollarSign, 
  PhoneOutgoing, Menu, Bot, MessageSquare,
  FileText, Calculator, Briefcase, Brain,
  Presentation, Phone, Building
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useLocation } from "react-router-dom";
import { useIndustry } from "@/context/IndustryContext";

// Define a type for navigation items
interface NavItem {
  name: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

const itemColors = [
  "bg-blue-600", // Dashboard
  "bg-purple-600", // Leads
  "bg-green-600", // Power Dialer
  "bg-yellow-600", // Inbox
  "bg-pink-600", // Tasks
  "bg-orange-600", // Calendar
  "bg-teal-600", // Pipeline/Deals
  "bg-indigo-600", // Reporting
  "bg-gray-600", // Settings
  "bg-violet-600", // AI Dialer
  "bg-emerald-600", // SMS Campaign
  "bg-rose-600", // Start an Application
  "bg-amber-600", // Quick Pricer
];

const Sidebar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { activeIndustry } = useIndustry();
  
  // Base navigation items that appear for all industries
  const baseNavItems: NavItem[] = [
    { name: "Dashboard", icon: Home, path: "/" },
    { name: "Leads", icon: Users, path: "/people" },
    { name: "Power Dialer", icon: PhoneOutgoing, path: "/power-dialer" },
    { name: "AI Dialer", icon: Bot, path: "/ai-dialer" },
    { name: "SMS Campaign", icon: MessageSquare, path: "/sms-campaign" },
    { name: "Inbox", icon: Inbox, badge: 5, path: "#" },
    { name: "Tasks", icon: ListTodo, path: "#" },
    { name: "Calendar", icon: Calendar, path: "#" },
  ];

  // Conditional navigation items based on industry
  const getIndustrySpecificItems = (): NavItem[] => {
    if (activeIndustry === "mortgage") {
      return [
        { name: "Pipeline", icon: DollarSign, path: "/deals" },
        { name: "Start an Application", icon: FileText, path: "/application" },
        { name: "Quick Pricer", icon: Calculator, path: "/pricer" },
        { name: "Amortization Calculator", icon: Calculator, path: "/amortization" },
        { name: "Pitch Deck Pro", icon: Presentation, path: "/pitch-deck" },
        { name: "Processor Assist", icon: Briefcase, path: "/processor" },
        { name: "AI Loan Officer", icon: Brain, path: "/ai-loan-officer" },
      ];
    } else if (activeIndustry === "realEstate") {
      return [
        { name: "Pipeline", icon: Building, path: "/pipeline" },
        { name: "AI Realtor", icon: Brain, path: "/ai-realtor" },
        { name: "Listing Presentation Builder", icon: Presentation, path: "/listing-presentation" }
      ];
    } else {
      return [
        { name: "Deals", icon: DollarSign, path: "/deals" },
      ];
    }
  };

  // Final navigation items
  const finalNavItems: NavItem[] = [
    ...baseNavItems,
    ...getIndustrySpecificItems(),
    { name: "Reporting", icon: BarChart2, path: "#" },
    { name: "Settings", icon: Settings, path: "/settings" },
  ];
  
  const getIndustryDisplayName = () => {
    switch (activeIndustry) {
      case "mortgage":
        return "Mortgage";
      case "realEstate":
        return "Real Estate";
      case "debtSettlement":
        return "Debt";
      default:
        return "";
    }
  };

  const getIndustryColor = () => {
    switch (activeIndustry) {
      case "mortgage":
        return "bg-blue-600";
      case "realEstate":
        return "bg-green-600";
      case "debtSettlement":
        return "bg-purple-600";
      default:
        return "bg-crm-blue";
    }
  };
  
  const getIndustryTextColor = () => {
    return "text-white";
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === path;
    }
    return location.pathname === path || 
           (path !== "#" && location.pathname.startsWith(path));
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  if (isMobile) {
    return (
      <div className={`w-full ${getIndustryColor()}`}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center">
            <div className="h-10 w-10 flex items-center justify-center bg-white text-crm-blue rounded">
              <span className="font-bold text-sm">CRM</span>
            </div>
            <span className="ml-2 text-lg font-semibold text-white">
              {getIndustryDisplayName()} SalesPro
            </span>
          </div>
          <button 
            onClick={toggleMobileMenu}
            className="text-white p-2"
          >
            <Menu size={24} />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="px-2 pb-3 pt-1">
            <div className="grid grid-cols-3 gap-2">
              {finalNavItems.map((item, index) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "flex flex-col items-center px-3 py-3 text-sm font-medium rounded-md",
                      active 
                        ? "bg-white text-crm-blue"
                        : "text-white hover:bg-white/90 hover:text-crm-blue"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-6 w-6 mb-2",
                        active ? "text-crm-blue" : "text-white group-hover:text-crm-blue"
                      )}
                    />
                    <span className={cn("truncate text-base", active ? "text-crm-blue" : "text-white")}>
                      {item.name}
                    </span>
                    {item.badge && (
                      <span className="ml-auto bg-crm-red text-white text-sm px-2 py-0.5 rounded-full absolute top-0 right-0">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "hidden md:block h-screen transition-all duration-300 rounded-tr-2xl rounded-br-2xl",
        getIndustryColor(),
        expanded ? "w-72" : "w-20"
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="py-6">
        <div className={cn("px-4 py-3 mb-6", expanded ? "" : "flex justify-center")}>
          <div className="flex items-center">
            <div className="h-10 w-10 flex items-center justify-center bg-white text-crm-blue rounded">
              <span className="font-bold text-sm">CRM</span>
            </div>
            {expanded && (
              <span className="ml-2 text-lg font-semibold text-white">
                {getIndustryDisplayName()} SalesPro
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {finalNavItems.map((item, index) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center py-3 text-base font-medium rounded-md mx-2 group relative transition-all",
                  active 
                    ? itemColors[index % itemColors.length]
                    : "text-white hover:text-white",
                  expanded ? "px-5" : "px-0 justify-center"
                )}
              >
                <div 
                  className={cn(
                    "absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 rounded-md", 
                    !active && itemColors[index % itemColors.length]
                  )}
                />
                <item.icon
                  className={cn(
                    "h-6 w-6 flex-shrink-0",
                    active ? "text-white" : "text-white group-hover:text-white",
                    expanded ? "mr-4" : "mr-0",
                    "relative z-10"
                  )}
                />
                {expanded && (
                  <span className={cn(
                    "relative z-10", 
                    active ? "text-white" : "text-white"
                  )}>
                    {item.name}
                  </span>
                )}
                {item.badge && (
                  <span className="ml-auto bg-crm-red text-white text-sm px-2 py-0.5 rounded-full relative z-10">
                    {item.badge}
                  </span>
                )}
                {!expanded && item.badge && (
                  <span className="absolute top-0 right-0 bg-crm-red w-2.5 h-2.5 rounded-full relative z-10"></span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
