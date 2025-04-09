
import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useIndustry } from "@/context/IndustryContext";
import { useNavigate } from "react-router-dom";
import { Presentation, Download, Copy, ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PitchDeckPro = () => {
  const navigate = useNavigate();
  const { activeIndustry } = useIndustry();
  const [activeTab, setActiveTab] = useState("purchase");

  // Redirect if not mortgage industry
  useEffect(() => {
    if (activeIndustry !== "mortgage") {
      navigate("/settings");
    }
  }, [activeIndustry, navigate]);

  // Template types for different scenarios
  const templates = {
    purchase: [
      { name: "First-Time Homebuyer", slides: 12, description: "Perfect for clients new to the homebuying process" },
      { name: "Move-Up Buyer", slides: 14, description: "For clients selling their current home to buy a new one" },
      { name: "Investment Property", slides: 10, description: "Focused on ROI and investment benefits" },
    ],
    refinance: [
      { name: "Rate & Term Refinance", slides: 8, description: "Highlights interest savings and payment reduction" },
      { name: "Cash-Out Refinance", slides: 11, description: "Emphasizes home equity uses and benefits" },
      { name: "Debt Consolidation", slides: 9, description: "Shows financial benefits of consolidating high-interest debt" },
    ],
    specialized: [
      { name: "VA Loan Benefits", slides: 10, description: "Tailored for military veterans and service members" },
      { name: "FHA Loan Overview", slides: 9, description: "Great for first-time buyers with credit challenges" },
      { name: "Jumbo Loan Options", slides: 12, description: "For high-value properties exceeding conforming limits" },
    ],
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Presentation className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">Pitch Deck Pro</h1>
          </div>
          <Badge className="bg-blue-600">Mortgage Pro Feature</Badge>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Create Professional Mortgage Presentations</CardTitle>
            <CardDescription>
              Choose from professionally designed templates to create compelling presentations for your clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="purchase" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="purchase">Purchase</TabsTrigger>
                <TabsTrigger value="refinance">Refinance</TabsTrigger>
                <TabsTrigger value="specialized">Specialized</TabsTrigger>
              </TabsList>
              
              {Object.keys(templates).map((category) => (
                <TabsContent key={category} value={category} className="space-y-4 pt-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    {templates[category as keyof typeof templates].map((template, idx) => (
                      <Card key={idx} className="overflow-hidden border-2 transition-all hover:border-blue-500 hover:shadow-md">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-3"></div>
                        <CardContent className="p-4">
                          <div className="h-36 flex items-center justify-center bg-gray-100 rounded-md mb-4">
                            <FileText className="h-12 w-12 text-gray-400" />
                          </div>
                          <h3 className="font-semibold text-lg">{template.name}</h3>
                          <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{template.slides} slides</span>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="sm" className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>My Presentations</CardTitle>
            <CardDescription>
              Access and manage your previously created presentations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-40 border border-dashed rounded-md bg-gray-50">
              <div className="text-center">
                <p className="text-gray-500">No saved presentations yet</p>
                <Button variant="link" className="mt-2">Create your first presentation</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default PitchDeckPro;
