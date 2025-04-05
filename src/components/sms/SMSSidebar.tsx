
import React, { useState } from "react";
import { 
  Plus, 
  Megaphone, 
  Inbox, 
  Smile, 
  BarChart, 
  Settings 
} from "lucide-react";
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";

const SMSSidebar = () => {
  const { setOpen } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setOpen(false);
  };

  return (
    <div 
      className="h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <Sidebar 
        variant="floating" 
        className="bg-pink-50 visible" 
        collapsible="icon">
        <SidebarRail />
        <SidebarHeader className="border-b border-pink-100">
          <div className="flex items-center justify-between px-4 pt-1">
            <h2 className={`text-lg font-semibold text-pink-700 ${!isHovered ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>SMS Tools</h2>
            <SidebarTrigger />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="New Campaign"
                    className="bg-pink-200 hover:bg-pink-300"
                  >
                    <Plus className="text-pink-600" />
                    {isHovered && (
                      <span className="ml-2 transition-all duration-200 whitespace-nowrap">New Campaign</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Campaigns"
                    className="bg-purple-200 hover:bg-purple-300"
                  >
                    <Megaphone className="text-purple-600" />
                    {isHovered && (
                      <span className="ml-2 transition-all duration-200 whitespace-nowrap">Campaigns</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Inbox"
                    className="bg-blue-200 hover:bg-blue-300"
                  >
                    <Inbox className="text-blue-600" />
                    {isHovered && (
                      <span className="ml-2 transition-all duration-200 whitespace-nowrap">Inbox</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Contacts"
                    className="bg-green-200 hover:bg-green-300"
                  >
                    <Smile className="text-green-600" />
                    {isHovered && (
                      <span className="ml-2 transition-all duration-200 whitespace-nowrap">Contacts</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Analytics"
                    className="bg-yellow-200 hover:bg-yellow-300"
                  >
                    <BarChart className="text-yellow-600" />
                    {isHovered && (
                      <span className="ml-2 transition-all duration-200 whitespace-nowrap">Analytics</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="mt-auto border-t border-pink-100">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Settings"
                className="bg-gray-200 hover:bg-gray-300"
              >
                <Settings className="text-gray-600" />
                {isHovered && (
                  <span className="ml-2 transition-all duration-200 whitespace-nowrap">Settings</span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </div>
  );
};

export default SMSSidebar;
