
import React from "react";
import { Search, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";

const Navbar = () => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search"
              className="pl-10 pr-4 py-2 w-full max-w-md"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
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
    </div>
  );
};

export default Navbar;
