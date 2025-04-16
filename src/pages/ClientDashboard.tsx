
import React, { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Home,
  MessageCircle,
  FileCheck,
  Bell,
  LogOut,
  User
} from "lucide-react";
import { toast } from "sonner";

interface LoanStatus {
  stage: string;
  progress: number;
}

const loanStages = [
  "Application Created",
  "Disclosures Sent",
  "Disclosures Signed",
  "Submitted",
  "Processing",
  "Approved",
  "CD Generated",
  "CD Signed",
  "CTC",
  "Docs Out",
  "Closing",
  "FUNDED"
];

const ClientDashboard = () => {
  const [currentStatus, setCurrentStatus] = useState<LoanStatus>({
    stage: "Processing",
    progress: 42
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("clientPortalLoggedIn");
    if (isLoggedIn !== "true") {
      navigate("/client-portal");
      return;
    }
    
    // For demo purposes, let's default to the home tab
    navigate("/client-dashboard/home", { replace: true });
    
    // Fetch loan status (mocked)
    // In a real application, you would fetch this from an API
    const loanStatus = {
      stage: "Processing",
      progress: 42 // percentage complete
    };
    setCurrentStatus(loanStatus);
  }, [navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/client-dashboard/${value}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("clientPortalLoggedIn");
    localStorage.removeItem("clientPortalUser");
    navigate("/client-portal");
    toast.success("Logged out successfully");
  };

  const getStageIndex = (stage: string): number => {
    return loanStages.findIndex(s => s === stage);
  };

  // Calculate progress based on current stage index
  const calculateProgress = (stage: string): number => {
    const currentIndex = getStageIndex(stage);
    return Math.round(((currentIndex + 1) / loanStages.length) * 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-blue-800">Mortgage Portal</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium">user1</span>
            </div>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center text-sm"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      {/* Progress Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto py-4 px-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-blue-700">Loan Progress</h2>
            <span className="text-sm text-blue-600 font-medium">
              Current Status: {currentStatus.stage}
            </span>
          </div>
          <Progress 
            value={calculateProgress(currentStatus.stage)} 
            className="h-2"
          />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Application</span>
            <span>Processing</span>
            <span>Approval</span>
            <span>Closing</span>
            <span>Funded</span>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto">
          <Tabs 
            defaultValue="home"
            className="w-full"
            onValueChange={handleTabChange}
          >
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="home" className="flex items-center">
                <Home className="h-4 w-4 mr-2" />
                <span>Home</span>
              </TabsTrigger>
              <TabsTrigger value="conditions" className="flex items-center">
                <FileCheck className="h-4 w-4 mr-2" />
                <span>Remaining Conditions</span>
              </TabsTrigger>
              <TabsTrigger value="attention" className="flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                <span>Attention Needed</span>
              </TabsTrigger>
              <TabsTrigger value="support" className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-2" />
                <span>24/7 Support</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 container mx-auto p-4 md:p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default ClientDashboard;
