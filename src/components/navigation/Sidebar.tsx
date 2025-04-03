
import React, { useState } from "react";
import { 
  Users, Inbox, ListTodo, Calendar, 
  BarChart2, Settings, Home, DollarSign, 
  PhoneOutgoing, Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const itemColors = [
  "bg-blue-600", // Dashboard
  "bg-purple-600", // People
  "bg-green-600", // Power Dialer
  "bg-yellow-600", // Inbox
  "bg-pink-600", // Tasks
  "bg-orange-600", // Calendar
  "bg-teal-600", // Deals
  "bg-indigo-600", // Reporting
  "bg-gray-600", // Admin
];

const navItems = [
  { name: "Dashboard", icon: Home, active: true },
  { name: "People", icon: Users, active: false },
  { name: "Power Dialer", icon: PhoneOutgoing, active: false },
  { name: "Inbox", icon: Inbox, active: false, badge: 5 },
  { name: "Tasks", icon: ListTodo, active: false },
  { name: "Calendar", icon: Calendar, active: false },
  { name: "Deals", icon: DollarSign, active: false },
  { name: "Reporting", icon: BarChart2, active: false },
  { name: "Admin", icon: Settings, active: false },
];

const Sidebar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  if (isMobile) {
    return (
      <div className="w-full bg-crm-blue">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center">
            <div className="h-8 w-8 flex items-center justify-center bg-white text-crm-blue rounded">
              <span className="font-bold">CRM</span>
            </div>
            <span className="ml-2 text-lg font-semibold text-white">SalesPro</span>
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
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href="#"
                  className={cn(
                    "flex flex-col items-center px-3 py-3 text-sm font-medium rounded-md",
                    item.active 
                      ? "bg-white text-crm-blue"
                      : "text-white hover:bg-white/90 hover:text-crm-blue"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-6 w-6 mb-2",
                      item.active ? "text-crm-blue" : "text-white group-hover:text-crm-blue"
                    )}
                  />
                  <span className="truncate text-white text-base">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto bg-crm-red text-white text-sm px-2 py-0.5 rounded-full absolute top-0 right-0">
                      {item.badge}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "hidden md:block bg-crm-blue h-screen transition-all duration-300 rounded-tr-2xl rounded-br-2xl", // Added rounded top-right and bottom-right edges
        expanded ? "w-72" : "w-20"
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="py-6">
        <div className={cn("px-4 py-3 mb-6", expanded ? "" : "flex justify-center")}>
          <div className="flex items-center">
            <div className="h-8 w-8 flex items-center justify-center bg-white text-crm-blue rounded">
              <span className="font-bold">CRM</span>
            </div>
            {expanded && <span className="ml-2 text-lg font-semibold text-white">SalesPro</span>}
          </div>
        </div>
        <div className="space-y-2">
          {navItems.map((item, index) => (
            <a
              key={item.name}
              href="#"
              className={cn(
                "flex items-center py-3 text-base font-medium rounded-md mx-2 group relative transition-all",
                item.active 
                  ? "bg-white text-crm-blue"
                  : "text-white hover:text-white",
                expanded ? "px-5" : "px-0 justify-center"
              )}
            >
              <div 
                className={cn(
                  "absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 rounded-md", 
                  !item.active && itemColors[index]
                )}
              />
              <item.icon
                className={cn(
                  "h-6 w-6 flex-shrink-0",
                  item.active ? "text-crm-blue" : "text-white group-hover:text-white",
                  expanded ? "mr-4" : "mr-0",
                  "relative z-10"
                )}
              />
              {expanded && (
                <span className="relative z-10 text-white text-base">
                  {item.name}
                </span>
              )}
              {expanded && item.badge && (
                <span className="ml-auto bg-crm-red text-white text-sm px-2 py-0.5 rounded-full relative z-10">
                  {item.badge}
                </span>
              )}
              {!expanded && item.badge && (
                <span className="absolute top-0 right-0 bg-crm-red w-2.5 h-2.5 rounded-full relative z-10"></span>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
