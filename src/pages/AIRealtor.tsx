
import React from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, Building, User, MessageSquare, Home } from "lucide-react";
import { useIndustry } from "@/context/IndustryContext";

const AIRealtor = () => {
  const { activeIndustry } = useIndustry();
  const [prompt, setPrompt] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [response, setResponse] = React.useState("");

  // Simulating AI response for demo purposes
  const handleGenerate = () => {
    if (!prompt) return;
    
    setGenerating(true);
    setResponse("");
    
    // Simulated AI response generation with delay
    setTimeout(() => {
      const responses = [
        "Based on the property details, I recommend highlighting the newly renovated kitchen and the proximity to schools in your marketing materials. The comparable properties in the area are selling for $425,000 on average.",
        "For this colonial-style home, focus on the historical character and large backyard. Similar properties in this neighborhood have been on the market for an average of 32 days.",
        "This condo's downtown location and modern amenities are key selling points. I suggest staging the property to emphasize the open floor plan and city views."
      ];
      setResponse(responses[Math.floor(Math.random() * responses.length)]);
      setGenerating(false);
    }, 1500);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">AI Realtor Assistant</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ask your AI Realtor</CardTitle>
                <CardDescription>
                  Get AI-powered insights for property listings, market analysis, and client communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Ask about property valuation, marketing strategies, neighborhood data, or get help drafting listing descriptions..."
                    className="min-h-[120px]"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <Button 
                    onClick={handleGenerate}
                    disabled={generating || !prompt}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {generating ? "Generating..." : "Generate Response"}
                  </Button>

                  {response && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-md">
                      <div className="flex items-start space-x-3">
                        <Brain className="h-5 w-5 text-green-600 mt-1" />
                        <div className="text-gray-700">{response}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Search className="mr-2 h-4 w-4" />
                    Analyze Comp Properties
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Draft Client Email
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Building className="mr-2 h-4 w-4" />
                    Generate Property Description
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Home className="mr-2 h-4 w-4" />
                    Create Home Valuation
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Analyses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <div className="font-medium text-sm">123 Main St. Market Analysis</div>
                    <div className="text-xs text-gray-500">Yesterday</div>
                  </div>
                  <div className="p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <div className="font-medium text-sm">Neighborhood Trend Report</div>
                    <div className="text-xs text-gray-500">2 days ago</div>
                  </div>
                  <div className="p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <div className="font-medium text-sm">Highland Acres Valuation</div>
                    <div className="text-xs text-gray-500">Last week</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AIRealtor;
