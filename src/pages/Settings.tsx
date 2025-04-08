
import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Home, Building, DollarSign, UserRound } from "lucide-react";
import { ColoredSwitch } from "@/components/ui/colored-switch";
import { useIndustry, IndustryType } from "@/context/IndustryContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const { activeIndustry, setActiveIndustry } = useIndustry();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id)
        .single();

      if (error) {
        throw error;
      }

      setUserRole(data.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
      toast({
        title: "Error",
        description: "Could not fetch user account type",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler that ensures only one industry can be active at a time
  const handleIndustryChange = (industry: IndustryType, isChecked: boolean) => {
    if (isChecked) {
      // If turning on, make this the only active industry
      setActiveIndustry(industry);
    } else if (activeIndustry === industry) {
      // If turning off the currently active industry, set to null
      setActiveIndustry(null);
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
      </div>
    </MainLayout>
  );
};

export default Settings;
