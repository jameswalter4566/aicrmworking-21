
import React from "react";
import { 
  Home, 
  FileText, 
  AlertTriangle, 
  MessageCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface ClientPortalSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  urgentCount?: number;
}

const ClientPortalSidebar = ({ activeTab, setActiveTab, urgentCount }: ClientPortalSidebarProps) => {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Dashboard', color: 'bg-blue-100' },
    { id: 'conditions', icon: FileText, label: 'Conditions', color: 'bg-blue-200' },
    { id: 'attention', icon: AlertTriangle, label: 'Attention', color: 'bg-blue-300' },
    { id: 'support', icon: MessageCircle, label: 'Support', color: 'bg-blue-400' },
  ];

  return (
    <div className="h-full">
      <Sidebar 
        className="bg-blue-600 text-white rounded-tr-3xl shadow-xl z-10" 
        collapsible="icon"
      >
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeTab === item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`relative flex items-center w-full rounded-lg ${item.color} hover:bg-blue-700 transition-colors`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="ml-3">{item.label}</span>
                      {item.id === 'attention' && urgentCount && urgentCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {urgentCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </div>
  );
};

export default ClientPortalSidebar;
