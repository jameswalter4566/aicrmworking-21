import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  BarChart, 
  Home, 
  Settings, 
  Users,
  FileText,
  Phone,
  LineChart,
  Calculator,
  Brain
} from "lucide-react";
import { useIndustry } from "@/context/IndustryContext";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { activeIndustry, setActiveIndustry } = useIndustry();
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsExpanded(window.innerWidth >= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const mortgageItems = [
    { label: "Dashboard", icon: <Home className="h-4 w-4 mr-2" />, href: "/" },
    { label: "Leads", icon: <Users className="h-4 w-4 mr-2" />, href: "/people" },
    { label: "Pipeline", icon: <LineChart className="h-4 w-4 mr-2" />, href: "/pipeline" },
    { label: "Processor", icon: <Brain className="h-4 w-4 mr-2" />, href: "/processor" },
    { label: "AI Dialer", icon: <Phone className="h-4 w-4 mr-2" />, href: "/ai-dialer" },
    { label: "AI Marketer", icon: <BarChart className="h-4 w-4 mr-2" />, href: "/sms-campaign" },
    { label: "Pitch Deck", icon: <FileText className="h-4 w-4 mr-2" />, href: "/pitch-deck-pro" },
    { label: "Home Solution", icon: <Home className="h-4 w-4 mr-2" />, href: "/your-home-solution" },
    { label: "Amortization", icon: <Calculator className="h-4 w-4 mr-2" />, href: "/amortization-calculator" },
  ];

  const realEstateItems = [
    { label: "Dashboard", icon: <Home className="h-4 w-4 mr-2" />, href: "/" },
    { label: "Leads", icon: <Users className="h-4 w-4 mr-2" />, href: "/people" },
    { label: "Deals", icon: <LineChart className="h-4 w-4 mr-2" />, href: "/deals" },
    { label: "AI Dialer", icon: <Phone className="h-4 w-4 mr-2" />, href: "/ai-dialer" },
    { label: "AI Marketer", icon: <BarChart className="h-4 w-4 mr-2" />, href: "/sms-campaign" },
    { label: "Listing Presentation", icon: <FileText className="h-4 w-4 mr-2" />, href: "/listing-presentation" },
  ];

  const handleIndustryChange = (industry: string) => {
    setActiveIndustry(industry);
    localStorage.setItem('activeIndustry', industry);
    navigate('/');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const items = activeIndustry === 'mortgage' ? mortgageItems : realEstateItems;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col bg-gray-900 text-white w-64 py-4 px-3 space-y-4 border-r border-gray-700 transition-transform duration-300",
          isExpanded ? "translate-x-0" : "-translate-x-64",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <span className="font-bold text-xl">CRM</span>
          <button onClick={() => setIsExpanded(!isExpanded)} className="focus:outline-none">
            {isExpanded ? '<<' : '>>'}
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="font-medium text-sm text-gray-400">Industry</h3>
          <select
            className="bg-gray-700 text-white rounded px-2 py-1 w-full"
            value={activeIndustry}
            onChange={(e) => handleIndustryChange(e.target.value)}
          >
            <option value="real_estate">Real Estate</option>
            <option value="mortgage">Mortgage</option>
          </select>
        </div>

        <div className="space-y-1">
          <h3 className="font-medium text-sm text-gray-400">Navigation</h3>
          {items.map((item) => (
            <Tooltip key={item.label} delayDuration={200}>
              <TooltipTrigger asChild>
                <a
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-800 transition-colors",
                    location.pathname === item.href ? "bg-gray-800" : "transparent"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="mt-auto">
          <h3 className="font-medium text-sm text-gray-400">Settings</h3>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <a
                href="/settings"
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-800 transition-colors",
                  location.pathname === "/settings" ? "bg-gray-800" : "transparent"
                )}
              >
                <Settings className="h-4 w-4 mr-2" />
                <span>Settings</span>
              </a>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              Settings
            </TooltipContent>
          </Tooltip>
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-800 transition-colors w-full justify-start"
          >
            <Home className="h-4 w-4 mr-2" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
