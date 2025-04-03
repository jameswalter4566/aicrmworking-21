
import React from "react";
import { Search, Bell, User, Home, Users, Inbox, ListTodo, Calendar, DollarSign, BarChart2, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", icon: Home, href: "/", active: true },
  { name: "People", icon: Users, href: "/people", active: false },
  { name: "Inbox", icon: Inbox, href: "#", active: false, badge: 5 },
  { name: "Tasks", icon: ListTodo, href: "#", active: false },
  { name: "Calendar", icon: Calendar, href: "#", active: false },
  { name: "Deals", icon: DollarSign, href: "/deals", active: false },
  { name: "Reporting", icon: BarChart2, href: "#", active: false },
  { name: "Admin", icon: Settings, href: "#", active: false },
];

const Navbar = () => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 flex items-center justify-center bg-crm-blue text-white rounded">
                <span className="font-bold">CRM</span>
              </div>
              <span className="ml-2 text-lg font-semibold">SalesPro</span>
            </div>
            <div className="md:hidden">
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Bell className="h-5 w-5 text-gray-500" />
              </button>
              <Avatar className="h-8 w-8 bg-crm-blue text-white ml-2">
                <span className="text-xs">S</span>
              </Avatar>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex-1 max-w-md mx-auto md:mx-0 md:ml-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search"
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <Bell className="h-5 w-5 text-gray-500" />
            </button>
            <div className="relative">
              <Avatar className="h-8 w-8 bg-crm-blue text-white">
                <span className="text-xs">S</span>
              </Avatar>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <nav className="flex space-x-1 px-4 py-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap",
                  item.active 
                    ? "text-crm-blue bg-crm-lightBlue"
                    : "text-gray-600 hover:text-crm-blue hover:bg-gray-50"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-1 h-5 w-5 flex-shrink-0",
                    item.active ? "text-crm-blue" : "text-gray-400 group-hover:text-crm-blue"
                  )}
                />
                {item.name}
                {item.badge && (
                  <span className="ml-1 bg-crm-red text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
