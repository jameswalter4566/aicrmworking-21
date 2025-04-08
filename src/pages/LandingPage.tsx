
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedText from "@/components/AnimatedText";

const LandingPage = () => {
  const navigate = useNavigate();
  
  const rotatingTexts = [
    "Mortgage Loan Officers",
    "Real Estate Agents",
    "Debt Officers"
  ];
  
  // Define custom colors for each text
  const textColors = ["text-crm-blue", "text-purple-500", "text-orange-500"];
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 py-16 bg-gradient-to-b from-white to-gray-100">
        <div className="w-full max-w-4xl text-center space-y-8">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 flex items-center justify-center bg-crm-blue text-white rounded-xl">
              <span className="font-bold text-2xl">CRM</span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
            <span className="inline-block mr-3">Best CRM for:</span>
            <AnimatedText texts={rotatingTexts} colors={textColors} />
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
            The all-in-one CRM platform for managing leads, calls, and closing more deals.
          </p>
          
          <div className="pt-6">
            <Button 
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6 h-auto bg-crm-blue hover:bg-crm-blue/90"
            >
              Get Started
            </Button>
          </div>
          
          <div className="pt-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {["Integrated Dialer", "AI Assistance", "Sales Analytics"].map((feature, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold mb-3">{feature}</h3>
                  <p className="text-gray-600">
                    Streamline your workflow and increase productivity with our powerful features.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="h-10 w-10 flex items-center justify-center bg-white text-crm-blue rounded">
                <span className="font-bold text-sm">CRM</span>
              </div>
              <span className="ml-2 text-lg font-semibold">SalesPro</span>
            </div>
            <div className="text-sm text-gray-400">
              © {new Date().getFullYear()} SalesPro CRM. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
