
import React, { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Home, Building, DollarSign } from "lucide-react";
import { ColoredSwitch } from "@/components/ui/colored-switch";

const Settings = () => {
  const [mortgageEnabled, setMortgageEnabled] = useState(false);
  const [realEstateEnabled, setRealEstateEnabled] = useState(false);
  const [debtSettlementEnabled, setDebtSettlementEnabled] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <SettingsIcon className="h-6 w-6 text-gray-500" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

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
                Choose which industry modules you want to enable in your CRM
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
                      checked={mortgageEnabled}
                      onCheckedChange={setMortgageEnabled}
                      colorScheme="blue"
                    />
                    <Label htmlFor="mortgage-mode" className="sr-only">
                      Mortgage mode
                    </Label>
                    <span className="text-sm font-medium">
                      {mortgageEnabled ? "On" : "Off"}
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
                      checked={realEstateEnabled}
                      onCheckedChange={setRealEstateEnabled}
                      colorScheme="green"
                    />
                    <Label htmlFor="real-estate-mode" className="sr-only">
                      Real Estate mode
                    </Label>
                    <span className="text-sm font-medium">
                      {realEstateEnabled ? "On" : "Off"}
                    </span>
                  </div>
                </div>

                {/* Debt Settlement Sales Pro */}
                <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="flex space-x-3">
                    <div className="bg-purple-500 p-2 rounded-md">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium">Debt Settlement Sales Pro</h4>
                      <p className="text-sm text-gray-500">
                        Enable debt settlement industry specific features
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ColoredSwitch
                      id="debt-settlement-mode"
                      checked={debtSettlementEnabled}
                      onCheckedChange={setDebtSettlementEnabled}
                      colorScheme="purple"
                    />
                    <Label htmlFor="debt-settlement-mode" className="sr-only">
                      Debt Settlement mode
                    </Label>
                    <span className="text-sm font-medium">
                      {debtSettlementEnabled ? "On" : "Off"}
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
