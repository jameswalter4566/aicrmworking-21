
import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Home, FileText, AlertTriangle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  value: string;
}

interface ClientPortalNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  urgentCount?: number;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", value: "home" },
  { icon: FileText, label: "Conditions", value: "conditions" },
  { icon: AlertTriangle, label: "Attention", value: "attention" },
  { icon: MessageCircle, label: "Support", value: "support" },
];

export const ClientPortalNav = ({ activeTab, setActiveTab, urgentCount = 0 }: ClientPortalNavProps) => {
  return (
    <Sidebar className="bg-gradient-to-b from-blue-900 to-blue-950 text-white border-r-0">
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.value}>
              <SidebarMenuButton
                onClick={() => setActiveTab(item.value)}
                className={cn(
                  "w-full rounded-xl transition-all duration-200",
                  "hover:bg-white hover:text-blue-900",
                  activeTab === item.value ? "bg-white/10" : "bg-transparent",
                )}
              >
                <item.icon className="mr-2 h-5 w-5" />
                <span>{item.label}</span>
                {item.value === "attention" && urgentCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {urgentCount}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};
