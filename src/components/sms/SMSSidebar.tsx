
import React from "react";
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const SMSSidebar = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <Sidebar variant="floating" className="bg-pink-50">
          <SidebarRail />
          <SidebarHeader className="border-b border-pink-100">
            <div className="flex items-center justify-between px-4 pt-1">
              <h2 className="text-lg font-semibold text-pink-700">SMS Tools</h2>
              <SidebarTrigger />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-pink-500">Messaging</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="New Campaign"
                    >
                      <Plus className="text-pink-600" />
                      <span>New Campaign</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Campaigns"
                    >
                      <Megaphone className="text-pink-600" />
                      <span>Campaigns</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Inbox"
                    >
                      <Inbox className="text-pink-600" />
                      <span>Inbox</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-pink-500">Audience</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Contacts"
                    >
                      <Smile className="text-pink-600" />
                      <span>Contacts</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Analytics"
                    >
                      <BarChart className="text-pink-600" />
                      <span>Analytics</span>
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
                >
                  <Settings className="text-pink-600" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* This is just a placeholder for the sidebar layout */}
        <div className="flex-1 hidden">
          {/* Content will be rendered by the parent component */}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SMSSidebar;
