
import React from "react";
import { 
  Users, Inbox, ListTodo, Calendar, 
  BarChart2, Settings, Home, DollarSign 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", icon: Home, active: true },
  { name: "People", icon: Users, active: false },
  { name: "Inbox", icon: Inbox, active: false, badge: 5 },
  { name: "Tasks", icon: ListTodo, active: false },
  { name: "Calendar", icon: Calendar, active: false },
  { name: "Deals", icon: DollarSign, active: false },
  { name: "Reporting", icon: BarChart2, active: false },
  { name: "Admin", icon: Settings, active: false },
];

const Sidebar = () => {
  return (
    <div className="hidden md:block w-60 bg-white border-r border-gray-200">
      <div className="py-4">
        <div className="px-4 py-2 mb-4">
          <div className="flex items-center">
            <div className="h-8 w-8 flex items-center justify-center bg-crm-blue text-white rounded">
              <span className="font-bold">CRM</span>
            </div>
            <span className="ml-2 text-lg font-semibold">SalesPro</span>
          </div>
        </div>
        <div className="space-y-1">
          {navItems.map((item) => (
            <a
              key={item.name}
              href="#"
              className={cn(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md group",
                item.active 
                  ? "text-crm-blue bg-crm-lightBlue"
                  : "text-gray-600 hover:text-crm-blue hover:bg-gray-50"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  item.active ? "text-crm-blue" : "text-gray-400 group-hover:text-crm-blue"
                )}
              />
              {item.name}
              {item.badge && (
                <span className="ml-auto bg-crm-red text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
