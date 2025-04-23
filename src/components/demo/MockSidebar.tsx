
import React from "react";
import { 
  Home, 
  Phone, 
  Users, 
  FileText, 
  Calendar, 
  MessageSquare, 
  Settings,
  PieChart,
  ClipboardList,
  UserCheck,
  Building,
  DollarSign,
  Calculator,
  Presentation,
  Briefcase,
  Brain
} from "lucide-react";

interface MockSidebarProps {
  industry: 'mortgage' | 'realEstate' | 'debtSettlement';
}

const industryMenuItems = {
  mortgage: [
    { icon: Home, label: "Dashboard" },
    { icon: Users, label: "Leads" },
    { icon: Phone, label: "Power Dialer" },
    { icon: Brain, label: "AI Dialer" },
    { icon: MessageSquare, label: "SMS Campaign" },
    { icon: FileText, label: "Inbox", badge: 5 },
    { icon: ClipboardList, label: "Tasks" },
    { icon: Calendar, label: "Calendar" },
    { icon: DollarSign, label: "Pipeline" },
    { icon: FileText, label: "Start an Application" },
    { icon: Calculator, label: "Quick Pricer" },
    { icon: Calculator, label: "Amortization Calculator" },
    { icon: Presentation, label: "Pitch Deck Pro" },
    { icon: Briefcase, label: "Processor Assist" },
    { icon: Brain, label: "AI Loan Officer" },
    { icon: PieChart, label: "Reporting" }
  ],
  realEstate: [
    { icon: Home, label: "Dashboard" },
    { icon: Users, label: "Leads" },
    { icon: Phone, label: "Power Dialer" },
    { icon: Brain, label: "AI Dialer" },
    { icon: MessageSquare, label: "SMS Campaign" },
    { icon: FileText, label: "Inbox", badge: 5 },
    { icon: ClipboardList, label: "Tasks" },
    { icon: Calendar, label: "Calendar" },
    { icon: Building, label: "Pipeline" },
    { icon: Brain, label: "AI Realtor" },
    { icon: Presentation, label: "Listing Presentation Builder" },
    { icon: PieChart, label: "Reporting" }
  ],
  debtSettlement: [
    { icon: Home, label: "Dashboard" },
    { icon: Users, label: "Leads" },
    { icon: Phone, label: "Power Dialer" },
    { icon: Brain, label: "AI Dialer" },
    { icon: MessageSquare, label: "SMS Campaign" },
    { icon: FileText, label: "Inbox", badge: 5 },
    { icon: ClipboardList, label: "Tasks" },
    { icon: Calendar, label: "Calendar" },
    { icon: DollarSign, label: "Deals" },
    { icon: PieChart, label: "Reporting" }
  ]
};

const getIndustryColor = (industry: 'mortgage' | 'realEstate' | 'debtSettlement') => {
  switch (industry) {
    case 'mortgage':
      return 'bg-blue-600';
    case 'realEstate':
      return 'bg-green-600';
    case 'debtSettlement':
      return 'bg-purple-600';
    default:
      return 'bg-gray-100';
  }
};

export const MockSidebar = ({ industry }: MockSidebarProps) => {
  const menuItems = industryMenuItems[industry];
  const backgroundColor = getIndustryColor(industry);
  
  return (
    <div className={`w-64 ${backgroundColor} h-full flex-shrink-0 rounded-tl-xl`}>
      <div className="flex items-center h-16 px-6 border-b border-white/20">
        <div className="h-8 w-8 bg-white rounded flex items-center justify-center">
          <span className="text-black text-sm font-bold">CRM</span>
        </div>
        <span className="ml-3 font-semibold text-white">
          {industry === 'mortgage' && "Mortgage SalesPro"}
          {industry === 'realEstate' && "Real Estate SalesPro"}
          {industry === 'debtSettlement' && "Debt SalesPro"}
        </span>
      </div>
      <nav className="p-4 space-y-1 flex flex-col">
        {menuItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-white/10 cursor-pointer relative"
          >
            <item.icon className="h-5 w-5 mr-3 text-white" />
            <span>{item.label}</span>
            {item.badge && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </div>
        ))}
        <div className="flex items-center px-3 py-2 text-sm font-medium text-white rounded-md hover:bg-white/10 cursor-pointer mt-auto">
          <Settings className="h-5 w-5 mr-3 text-white" />
          Settings
        </div>
      </nav>
    </div>
  );
};
