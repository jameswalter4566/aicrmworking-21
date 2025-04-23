
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  FileText, 
  MessageSquare, 
  Package, 
  Briefcase, 
  BookText, 
  ChevronRight,
  Brain,
  Upload,
  Download,
  FolderClosed
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLoanProgress } from "@/hooks/use-loan-progress";
import { supabase } from "@/integrations/supabase/client";

interface ProcessorSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  loanId?: string;
  borrowerName?: string;
  leadId?: string | number;
}

const ProcessorSidebar = ({ 
  activeSection, 
  onSectionChange, 
  loanId, 
  borrowerName,
  leadId
}: ProcessorSidebarProps) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoanSubmitted, setIsLoanSubmitted] = useState(false);
  const { updateLoanProgress, isUpdating } = useLoanProgress();

  // Use either the provided leadId or fallback to the id from the URL params
  const currentLeadId = leadId || id;

  useEffect(() => {
    const checkLoanStatus = async () => {
      const loanLeadId = leadId || id;
      if (!loanLeadId) return;

      try {
        const { data, error } = await supabase.functions.invoke('retrieve-loan-progress', {
          body: { leadId: loanLeadId }
        });

        if (!error && data?.data?.currentStep) {
          const isSubmitted = data.data.currentStep === "submitted" || 
            data.data.stepIndex >= data.data.allSteps.indexOf("submitted");
          
          setIsLoanSubmitted(isSubmitted);
        }
      } catch (error) {
        console.error("Error checking loan status:", error);
      }
    };

    checkLoanStatus();
  }, [leadId, id]);

  const handleSubmitLoan = async () => {
    const loanLeadId = leadId || id;
    
    if (!loanLeadId) {
      toast.error("Cannot submit loan: Lead ID is missing");
      return;
    }
    
    if (isLoanSubmitted) {
      handleDownload34();
      return;
    }
    
    try {
      const result = await updateLoanProgress(loanLeadId, "submitted", "Loan submitted for processing by processor");
      if (result.success) {
        toast.success("Loan successfully submitted for processing");
        setIsLoanSubmitted(true);
      } else {
        toast.error("Failed to submit loan: " + result.error);
      }
    } catch (error) {
      console.error("Error submitting loan:", error);
      toast.error("Failed to submit loan due to an unexpected error");
    } finally {
      setIsDialogOpen(false);
    }
  };

  const handleDownload34 = () => {
    toast.info("Downloading 3.4 form... This is a placeholder for the actual download functionality");
    setIsDialogOpen(false);
  };

  // Function to handle navigation to Smart Document Manager
  const handleDocumentManagerClick = () => {
    if (currentLeadId) {
      navigate(`/smart-document-manager/${currentLeadId}`);
    } else {
      toast.error("Lead ID is missing. Cannot open document manager.");
    }
  };

  return (
    <Sidebar
      variant="floating"
      className="bg-white border border-blue-100"
    >
      <SidebarHeader className="p-4 border-b border-blue-100">
        <div className="flex flex-col">
          <span className="font-bold text-blue-800">{loanId || `Loan ID: ML-${id}`}</span>
          <span className="text-sm text-blue-600">{borrowerName || "Borrower"}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="p-2">
          <Button
            onClick={() => setIsDialogOpen(true)}
            variant="default"
            size="sm"
            className={`w-full flex items-center justify-center ${
              isLoanSubmitted 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isLoanSubmitted ? (
              <>
                <Download className="mr-1 h-4 w-4" />
                Download 3.4
              </>
            ) : (
              <>
                <Upload className="mr-1 h-4 w-4" />
                Submit Loan (3.4)
              </>
            )}
          </Button>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-blue-700">Processor Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeSection === "conditions"} 
                  onClick={() => onSectionChange("conditions")}
                  tooltip="Borrower's Conditions"
                  className={cn(
                    "text-blue-900 transition-colors",
                    "hover:bg-blue-50",
                    activeSection === "conditions" ? "bg-blue-100 font-medium" : "bg-blue-25"
                  )}
                >
                  <FileText className="h-5 w-5" />
                  <span>Conditions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSection === "smartDocManager"}
                  tooltip="Smart Document Manager"
                  className={cn(
                    "text-blue-900 transition-colors hover:bg-blue-50",
                    activeSection === "smartDocManager" ? "bg-blue-100 font-medium" : "bg-blue-25"
                  )}
                  onClick={handleDocumentManagerClick}
                >
                  <FolderClosed className="h-5 w-5" />
                  <span>Smart Document Manager</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeSection === "conversation"} 
                  onClick={() => onSectionChange("conversation")}
                  tooltip="Client Conversations"
                  className={cn(
                    "text-blue-900 transition-colors",
                    "hover:bg-blue-50",
                    activeSection === "conversation" ? "bg-blue-100 font-medium" : "bg-blue-25"
                  )}
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
                  className={cn(
                    "text-blue-900 transition-colors",
                    "hover:bg-blue-50",
                    activeSection === "orderServices" ? "bg-blue-100 font-medium" : "bg-blue-25"
                  )}
                >
                  <Package className="h-5 w-5" />
                  <span>Order Services</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={activeSection === "aiLoanOfficer"} 
                  onClick={() => onSectionChange("aiLoanOfficer")}
                  tooltip="AI Loan Officer Assist"
                  className={cn(
                    "text-blue-900 transition-colors",
                    "hover:bg-blue-50",
                    activeSection === "aiLoanOfficer" ? "bg-blue-100 font-medium" : "bg-blue-25"
                  )}
                >
                  <Brain className="h-5 w-5" />
                  <span>AI Loan Officer Assist</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {activeSection === "orderServices" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-blue-700">Available Services</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-2">
                <Button
                  variant="outline"
                  onClick={() => onSectionChange("employmentVerification")}
                  className="w-full justify-start text-sm bg-white border-blue-200 hover:bg-blue-50 text-blue-900"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  <span>Employment Verification</span>
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => onSectionChange("titleOrder")}
                  className="w-full justify-start text-sm bg-white border-blue-200 hover:bg-blue-50 text-blue-900"
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

      <SidebarFooter className="p-4 border-t border-blue-100">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/processor')}
          className="w-full bg-white border-blue-300 hover:bg-blue-50 text-blue-900"
        >
          Back to Processor Hub
        </Button>
      </SidebarFooter>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isLoanSubmitted ? "Download 3.4" : "Submit Loan"}
            </DialogTitle>
            <DialogDescription>
              {isLoanSubmitted 
                ? "Do you want to download the 3.4 form?" 
                : "This will submit the loan for processing. Are you sure you want to continue?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmitLoan} 
              disabled={isUpdating}
              className={isLoanSubmitted 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-blue-600 hover:bg-blue-700"}
            >
              {isLoanSubmitted 
                ? "Download" 
                : isUpdating ? "Submitting..." : "Submit Loan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
};

export default ProcessorSidebar;
