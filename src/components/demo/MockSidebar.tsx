
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
  DollarSign
} from "lucide-react";

interface MockSidebarProps {
  industry: 'mortgage' | 'realEstate' | 'debtSettlement';
}

const industryMenuItems = {
  mortgage: [
    { icon: Home, label: "Dashboard" },
    { icon: Phone, label: "Dialer" },
    { icon: Users, label: "Borrowers" },
    { icon: FileText, label: "Loans" },
    { icon: ClipboardList, label: "Conditions" },
    { icon: Calendar, label: "Pipeline" },
    { icon: MessageSquare, label: "SMS" },
  ],
  realEstate: [
    { icon: Home, label: "Dashboard" },
    { icon: Phone, label: "Dialer" },
    { icon: Users, label: "Clients" },
    { icon: Building, label: "Properties" },
    { icon: Calendar, label: "Showings" },
    { icon: MessageSquare, label: "SMS" },
  ],
  debtSettlement: [
    { icon: Home, label: "Dashboard" },
    { icon: Phone, label: "Dialer" },
    { icon: Users, label: "Clients" },
    { icon: DollarSign, label: "Settlements" },
    { icon: PieChart, label: "Debts" },
    { icon: UserCheck, label: "Creditors" },
    { icon: MessageSquare, label: "SMS" },
  ]
};

export const MockSidebar = ({ industry }: MockSidebarProps) => {
  const menuItems = industryMenuItems[industry];
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-[600px] flex-shrink-0">
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="h-8 w-8 bg-crm-blue rounded flex items-center justify-center">
          <span className="text-white text-sm font-bold">CRM</span>
        </div>
        <span className="ml-3 font-semibold text-gray-900">SalesPro</span>
      </div>
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.label}
          </div>
        ))}
        <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 cursor-pointer mt-auto">
          <Settings className="h-5 w-5 mr-3" />
          Settings
        </div>
      </nav>
    </div>
  );
};
