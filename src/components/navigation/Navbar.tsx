
import React from "react";
import { Search, Bell, User, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext"; 
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/landing");
  };

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
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <Avatar className="h-8 w-8 bg-crm-blue text-white cursor-pointer">
                  <span className="text-xs">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
