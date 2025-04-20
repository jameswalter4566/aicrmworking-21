
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
    { id: 'home', icon: Home, label: 'Dashboard' },
    { id: 'conditions', icon: FileText, label: 'Conditions' },
    { id: 'attention', icon: AlertTriangle, label: 'Attention' },
    { id: 'support', icon: MessageCircle, label: 'Support' },
  ];

  return (
    <div className="h-full">
      <Sidebar 
        className="bg-blue-600 text-white rounded-tr-3xl shadow-xl z-10 w-56 pt-6 mt-4" 
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
                      className={`relative flex items-center w-full rounded-lg transition-colors ${
                        activeTab === item.id 
                          ? 'bg-blue-500 text-white ring-2 ring-white' 
                          : 'bg-white text-blue-600 hover:bg-blue-50'
                      }`}
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
