
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  FileText, 
  MessageSquare, 
  Package, 
  Briefcase, 
  BookText, 
  ChevronRight
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface ProcessorSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  loanId?: string;
  borrowerName?: string;
}

const ProcessorSidebar = ({ 
  activeSection, 
  onSectionChange, 
  loanId, 
  borrowerName 
}: ProcessorSidebarProps) => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <Sidebar
      variant="floating"
      className="bg-orange-50 border-orange-200"
    >
      <SidebarHeader className="p-4 border-b border-orange-200">
        <div className="flex flex-col">
          <span className="font-bold text-orange-800">{loanId || `Loan ID: ML-${id}`}</span>
          <span className="text-sm text-orange-600">{borrowerName || "Borrower"}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-orange-700">Processor Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeSection === "conditions"} 
                  onClick={() => onSectionChange("conditions")}
                  tooltip="Borrower's Conditions"
                  className="text-orange-900 hover:bg-orange-200"
                >
                  <FileText className="h-5 w-5" />
                  <span>Conditions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeSection === "conversation"} 
                  onClick={() => onSectionChange("conversation")}
                  tooltip="Client Conversations"
                  className="text-orange-900 hover:bg-orange-200"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Conversation</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeSection === "orderServices"}
                  onClick={() => onSectionChange("orderServices")}
                  tooltip="Order Services"
                  className="text-orange-900 hover:bg-orange-200"
                >
                  <Package className="h-5 w-5" />
                  <span>Order Services</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {activeSection === "orderServices" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-orange-700">Available Services</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-2">
                <Button
                  variant="outline"
                  onClick={() => onSectionChange("employmentVerification")}
                  className="w-full justify-start text-sm bg-white border-orange-200 hover:bg-orange-100"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  <span>Employment Verification</span>
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => onSectionChange("titleOrder")}
                  className="w-full justify-start text-sm bg-white border-orange-200 hover:bg-orange-100"
                >
                  <BookText className="h-4 w-4 mr-2" />
                  <span>Title Order</span>
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-orange-200">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/processor')}
          className="w-full bg-white border-orange-300 hover:bg-orange-100"
        >
          Back to Processor Hub
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default ProcessorSidebar;
