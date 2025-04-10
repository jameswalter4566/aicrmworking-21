
import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Home, Building, DollarSign, UserRound, Mail, Link, AlertCircle } from "lucide-react";
import { ColoredSwitch } from "@/components/ui/colored-switch";
import { useIndustry, IndustryType } from "@/context/IndustryContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Settings = () => {
  const { activeIndustry, setActiveIndustry } = useIndustry();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");

  useEffect(() => {
    // Check if email connections are already established
    const checkExistingConnections = async () => {
      // This would be replaced with actual API calls to check connections
      if (user) {
        try {
          // For demonstration, we're using localStorage, but in a real app,
          // this would be stored in your database
          const googleStatus = localStorage.getItem(`google_connected_${user.id}`);
          const outlookStatus = localStorage.getItem(`outlook_connected_${user.id}`);
          const savedEmail = localStorage.getItem(`connected_email_${user.id}`);
          
          setGoogleConnected(googleStatus === 'true');
          setOutlookConnected(outlookStatus === 'true');
          setEmailAddress(savedEmail || "");
        } catch (error) {
          console.error("Failed to check connection status:", error);
        }
      }
    };
    
    checkExistingConnections();
  }, [user]);

  // Handler that ensures only one industry can be active at a time
  const handleIndustryChange = (industry: IndustryType, isChecked: boolean) => {
    if (isChecked) {
      // If turning on, make this the only active industry
      setActiveIndustry(industry);
      toast({
        title: "Industry Mode Changed",
        description: `${getIndustryName(industry)} mode has been activated.`,
        duration: 3000,
      });
    } else if (activeIndustry === industry) {
      // If turning off the currently active industry, set to null
      setActiveIndustry(null);
      toast({
        title: "Industry Mode Deactivated",
        description: "Industry mode has been turned off.",
        duration: 3000,
      });
    }
  };

  // Helper function to get the formatted industry name
  const getIndustryName = (industry: IndustryType): string => {
    switch (industry) {
      case "mortgage": return "Mortgage Sales Pro";
      case "realEstate": return "Real Estate Sales Pro";
      case "debtSettlement": return "Debt Sales Pro";
      default: return "Unknown";
    }
  };

  // Mock function to connect to Google email
  const connectGoogleEmail = () => {
    setLoading(true);
    
    // Simulate OAuth flow with a timeout
    setTimeout(() => {
      if (user) {
        localStorage.setItem(`google_connected_${user.id}`, 'true');
        localStorage.setItem(`connected_email_${user.id}`, emailAddress);
        setGoogleConnected(true);
      }
      setLoading(false);
      toast({
        title: "Google Email Connected",
        description: "Your Google email has been successfully connected.",
        duration: 3000,
      });
    }, 1500);
  };

  // Mock function to connect to Microsoft Outlook
  const connectOutlookEmail = () => {
    setLoading(true);
    
    // Simulate OAuth flow with a timeout
    setTimeout(() => {
      if (user) {
        localStorage.setItem(`outlook_connected_${user.id}`, 'true');
        localStorage.setItem(`connected_email_${user.id}`, emailAddress);
        setOutlookConnected(true);
      }
      setLoading(false);
      toast({
        title: "Microsoft Outlook Connected",
        description: "Your Microsoft Outlook email has been successfully connected.",
        duration: 3000,
      });
    }, 1500);
  };

  // Function to disconnect Google email
  const disconnectGoogleEmail = () => {
    if (user) {
      localStorage.removeItem(`google_connected_${user.id}`);
      setGoogleConnected(false);
      toast({
        title: "Google Email Disconnected",
        description: "Your Google email has been disconnected.",
        duration: 3000,
      });
    }
  };

  // Function to disconnect Microsoft Outlook
  const disconnectOutlookEmail = () => {
    if (user) {
      localStorage.removeItem(`outlook_connected_${user.id}`);
      setOutlookConnected(false);
      toast({
        title: "Microsoft Outlook Disconnected",
        description: "Your Microsoft Outlook email has been disconnected.",
        duration: 3000,
      });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="h-6 w-6 text-gray-500" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* User Account Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Account</CardTitle>
            <CardDescription>
              Your account information and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Account Type</Label>
                <div className="flex items-center space-x-2">
                  <UserRound className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{loading ? "Loading..." : userRole || "Unknown"}</span>
                </div>
              </div>
              <Badge className="bg-blue-500 hover:bg-blue-600">
                {userRole === "admin" ? "Administrator" : userRole}
              </Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Email Address</Label>
              <div className="text-sm">{user?.email || "Not available"}</div>
            </div>
          </CardContent>
        </Card>

        {/* CRM Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>CRM Configuration</CardTitle>
            <CardDescription>
              Enable or disable features for different industries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Industry Mode</h3>
              <p className="text-sm text-gray-500">
                Choose which industry module you want to enable in your CRM (only one can be active at a time)
              </p>
              
              <div className="space-y-5">
                {/* Mortgage Sales Pro */}
                <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="flex space-x-3">
                    <div className="bg-blue-500 p-2 rounded-md">
                      <Home className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">Mortgage Sales Pro</h4>
                      <p className="text-sm text-gray-500">
                        Enable mortgage industry specific features
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ColoredSwitch
                      id="mortgage-mode"
                      checked={activeIndustry === "mortgage"}
                      onCheckedChange={(checked) => handleIndustryChange("mortgage", checked)}
                      colorScheme="blue"
                    />
                    <Label htmlFor="mortgage-mode" className="sr-only">
                      Mortgage mode
                    </Label>
                    <span className="text-sm font-medium">
                      {activeIndustry === "mortgage" ? "On" : "Off"}
                    </span>
                  </div>
                </div>

                {/* Real Estate Sales Pro */}
                <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="flex space-x-3">
                    <div className="bg-green-500 p-2 rounded-md">
                      <Building className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">Real Estate Sales Pro</h4>
                      <p className="text-sm text-gray-500">
                        Enable real estate industry specific features
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ColoredSwitch
                      id="real-estate-mode"
                      checked={activeIndustry === "realEstate"}
                      onCheckedChange={(checked) => handleIndustryChange("realEstate", checked)}
                      colorScheme="green"
                    />
                    <Label htmlFor="real-estate-mode" className="sr-only">
                      Real Estate mode
                    </Label>
                    <span className="text-sm font-medium">
                      {activeIndustry === "realEstate" ? "On" : "Off"}
                    </span>
                  </div>
                </div>

                {/* Debt Sales Pro */}
                <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="flex space-x-3">
                    <div className="bg-purple-500 p-2 rounded-md">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">Debt Sales Pro</h4>
                      <p className="text-sm text-gray-500">
                        Enable debt settlement industry specific features
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ColoredSwitch
                      id="debt-settlement-mode"
                      checked={activeIndustry === "debtSettlement"}
                      onCheckedChange={(checked) => handleIndustryChange("debtSettlement", checked)}
                      colorScheme="purple"
                    />
                    <Label htmlFor="debt-settlement-mode" className="sr-only">
                      Debt Settlement mode
                    </Label>
                    <span className="text-sm font-medium">
                      {activeIndustry === "debtSettlement" ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Integration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Email Integration</CardTitle>
            <CardDescription>
              Connect your email accounts for AI automations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-medium">Connect Your Email</h3>
              </div>
              <p className="text-sm text-gray-500">
                Connect your email account to enable AI automations for email processing and response handling.
                Your connection will remain active until you manually disconnect.
              </p>
              
              {!googleConnected && !outlookConnected && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-address">Email Address</Label>
                    <Input
                      id="email-address"
                      type="email"
                      placeholder="Enter your email address"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                  
                  <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                    <Button
                      onClick={connectGoogleEmail}
                      disabled={loading || !emailAddress}
                      className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Connecting...
                        </span>
                      ) : (
                        <>
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="white"/>
                          </svg>
                          <span>Connect with Google</span>
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={connectOutlookEmail}
                      disabled={loading || !emailAddress}
                      className="flex items-center justify-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Connecting...
                        </span>
                      ) : (
                        <>
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 5H3C1.89543 5 1 5.89543 1 7V17C1 18.1046 1.89543 19 3 19H21C22.1046 19 23 18.1046 23 17V7C23 5.89543 22.1046 5 21 5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 12L1 7M12 12L23 7M12 12V19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Connect with Outlook</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Connected Accounts */}
              {(googleConnected || outlookConnected) && (
                <div className="space-y-4">
                  <h4 className="font-medium">Connected Accounts</h4>
                  
                  {googleConnected && (
                    <div className="flex items-center justify-between p-4 border rounded-md">
                      <div className="flex items-center space-x-3">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#4285F4"/>
                        </svg>
                        <div>
                          <div className="font-medium">Google</div>
                          <div className="text-sm text-gray-500">{emailAddress}</div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={disconnectGoogleEmail}
                        className="text-red-500 hover:text-red-600"
                      >
                        Disconnect
                      </Button>
                    </div>
                  )}
                  
                  {outlookConnected && (
                    <div className="flex items-center justify-between p-4 border rounded-md">
                      <div className="flex items-center space-x-3">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 5H3C1.89543 5 1 5.89543 1 7V17C1 18.1046 1.89543 19 3 19H21C22.1046 19 23 18.1046 23 17V7C23 5.89543 22.1046 5 21 5Z" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 12L1 7M12 12L23 7M12 12V19" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div>
                          <div className="font-medium">Microsoft Outlook</div>
                          <div className="text-sm text-gray-500">{emailAddress}</div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={disconnectOutlookEmail}
                        className="text-red-500 hover:text-red-600"
                      >
                        Disconnect
                      </Button>
                    </div>
                  )}
                  
                  {/* Connection Info */}
                  <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-md">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                    <p className="text-sm text-blue-700">
                      Your email connection will remain active until you manually disconnect it. You can disconnect at any time.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings;
