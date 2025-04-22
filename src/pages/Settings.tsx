import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Settings as SettingsIcon, UserRound, Home, Building, DollarSign, Mail, AlertCircle, Phone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ColoredSwitch } from "@/components/ui/colored-switch";
import { useIndustry, IndustryType } from "@/context/IndustryContext";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { customSupabase } from "@/utils/supabase-custom-client";
import { CompanySettingsCard } from "@/components/settings/CompanySettings";
import { PhoneNumberField } from "@/components/settings/PhoneNumberField";

const SUPABASE_URL = "https://imrmboyczebjlbnkgjns.supabase.co";
const REDIRECT_URL = "https://preview--aicrmworking.lovable.app/settings";

const Settings = () => {
  const { activeIndustry, setActiveIndustry } = useIndustry();
  const { user, userRole, getAuthToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [processingOAuth, setProcessingOAuth] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const processOAuthCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      
      if (code) {
        setProcessingOAuth(true);
        window.history.replaceState({}, document.title, REDIRECT_URL);
        
        try {
          const token = await getAuthToken();
          if (!token) {
            throw new Error("Authentication required");
          }
          
          console.log("Processing OAuth callback with code:", code.substring(0, 10) + "...");
          
          const response = await fetch(`${SUPABASE_URL}/functions/v1/connect-google-email?action=callback&code=${encodeURIComponent(code)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", response.status, errorText.substring(0, 200));
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const textResponse = await response.text();
            console.error("Non-JSON response received:", textResponse.substring(0, 200));
            throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            setGoogleConnected(true);
            setEmailAddress(data.email);
            toast.success("Google Email Connected", {
              description: "Your Google email has been successfully connected."
            });
          } else {
            toast.error("Connection Failed", {
              description: data.error || "Failed to connect Google account."
            });
          }
        } catch (error) {
          console.error("Error processing OAuth callback:", error);
          toast.error("Connection Error", {
            description: "There was a problem connecting your Google account."
          });
        } finally {
          setProcessingOAuth(false);
        }
      }
    };

    const checkExistingConnections = async () => {
      if (user) {
        try {
          const { data, error } = await customSupabase
            .from('user_email_connections')
            .select('provider, email')
            .eq('user_id', user.id);
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            const googleConnection = data.find(conn => conn.provider === 'google');
            const outlookConnection = data.find(conn => conn.provider === 'outlook');
            
            if (googleConnection) {
              setGoogleConnected(true);
              setEmailAddress(googleConnection.email);
            }
            
            if (outlookConnection) {
              setOutlookConnected(true);
              setEmailAddress(outlookConnection.email);
            }
          }
        } catch (error) {
          console.error("Failed to check connection status:", error);
        }
      }
    };
    
    checkExistingConnections();
    processOAuthCallback();
  }, [user, getAuthToken]);

  const fetchUserProfile = async () => {
    if (user && user.id) {
      try {
        const { data, error } = await customSupabase
          .from('profiles')
          .select('phone_number')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data?.phone_number) {
          console.log("Fetched phone number from profile:", data.phone_number);
          setPhoneNumber(data.phone_number);
        } else {
          console.log("No phone number found in profile");
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    }
  };

  useEffect(() => {
    if (user && user.id) {
      fetchUserProfile();
    }
  }, [user]);

  const handleIndustryChange = (industry: IndustryType, isChecked: boolean) => {
    if (isChecked) {
      setActiveIndustry(industry);
      toast.success("Industry Mode Changed", {
        description: `${getIndustryName(industry)} mode has been activated.`
      });
    } else if (activeIndustry === industry) {
      setActiveIndustry(null);
      toast.success("Industry Mode Deactivated", {
        description: "Industry mode has been turned off."
      });
    }
  };

  const getIndustryName = (industry: IndustryType): string => {
    switch (industry) {
      case "mortgage": return "Mortgage Sales Pro";
      case "realEstate": return "Real Estate Sales Pro";
      case "debtSettlement": return "Debt Sales Pro";
      default: return "Unknown";
    }
  };

  const connectGoogleEmail = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('You must be logged in to connect your email account');
      }
      
      const functionUrl = `${SUPABASE_URL}/functions/v1/connect-google-email?action=authorize`;
      console.log("Calling Supabase function:", functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", response.status, errorText.substring(0, 200));
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Non-JSON response received:", textResponse.substring(0, 200));
        throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
      }
      
      const data = await response.json();
      
      if (data.url) {
        console.log("Redirecting to:", data.url.substring(0, 100) + "...");
        window.location.href = data.url;
      } else {
        throw new Error("Failed to generate authorization URL");
      }
    } catch (error) {
      console.error("Error initiating Google OAuth flow:", error);
      toast.error("Connection Error", {
        description: "Failed to start the Google connection process. Please try again later."
      });
      setLoading(false);
    }
  };

  const connectOutlookEmail = () => {
    setLoading(true);
    
    setTimeout(() => {
      if (user) {
        setOutlookConnected(true);
        setEmailAddress("user@outlook.com");
      }
      setLoading(false);
      toast.success("Microsoft Outlook Connected", {
        description: "Your Microsoft Outlook email has been successfully connected."
      });
    }, 1500);
  };

  const disconnectGoogleEmail = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/connect-google-email?action=disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider: 'google' })
      });
      
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        } else {
          const errorText = await response.text();
          console.error("Non-JSON error response:", errorText.substring(0, 200));
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Non-JSON response for disconnect:", textResponse.substring(0, 200));
        throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setGoogleConnected(false);
        setEmailAddress("");
        toast.success("Google Email Disconnected", {
          description: "Your Google email has been disconnected."
        });
      } else {
        throw new Error(data.error || "Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting Google account:", error);
      toast.error("Disconnection Error", {
        description: "Failed to disconnect your Google account. Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectOutlookEmail = () => {
    if (user) {
      setOutlookConnected(false);
      if (!googleConnected) {
        setEmailAddress("");
      }
      toast.success("Microsoft Outlook Disconnected", {
        description: "Your Microsoft Outlook email has been disconnected."
      });
    }
  };

  const updatePhoneNumber = async (newPhoneNumber: string): Promise<void> => {
    if (!user) return Promise.reject(new Error("No user logged in"));
    
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("No auth token available");

      const response = await fetch("https://imrmboyczebjlbnkgjns.supabase.co/functions/v1/update-user-account-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: newPhoneNumber
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();
      console.log("Phone number update response:", data);

      await fetchUserProfile(); // Refresh the profile data
      return Promise.resolve();
    } catch (error) {
      console.error("Error updating phone number:", error);
      return Promise.reject(error);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="h-6 w-6 text-gray-500" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <CompanySettingsCard />

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

            <PhoneNumberField 
              initialValue={phoneNumber}
              onUpdate={updatePhoneNumber}
            />
          </CardContent>
        </Card>

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
              
              {processingOAuth && (
                <div className="flex justify-center p-6">
                  <div className="flex flex-col items-center">
                    <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-blue-600 font-medium">Connecting your account...</p>
                  </div>
                </div>
              )}
              
              {!processingOAuth && !googleConnected && !outlookConnected && (
                <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                  <Button
                    onClick={connectGoogleEmail}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-3 text-base"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </span>
                    ) : (
                      <>
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="white"/>
                        </svg>
                        <span className="text-base">Connect with Google</span>
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={connectOutlookEmail}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white py-3 text-base"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </span>
                    ) : (
                      <>
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21 5H3C1.89543 5 1 5.89543 1 7V17C1 18.1046 1.89543 19 3 19H21C22.1046 19 23 18.1046 23 17V7C23 5.89543 22.1046 5 21 5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 12L1 7M12 12L23 7M12 12V19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-base">Connect with Outlook</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
              
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
                        disabled={loading}
                        className="text-red-500 hover:text-red-600"
                      >
                        {loading ? "Disconnecting..." : "Disconnect"}
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
                        disabled={loading}
                        className="text-red-500 hover:text-red-600"
                      >
                        {loading ? "Disconnecting..." : "Disconnect"}
                      </Button>
                    </div>
                  )}
                  
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
