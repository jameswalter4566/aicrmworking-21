
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedText from "@/components/AnimatedText";
import FloatingAnimation from "@/components/FloatingAnimation";
import { FeatureCard } from "@/components/FloatingCards";
import { Phone, Bot, LineChart } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const [featuresVisible, setFeaturesVisible] = useState(false);
  
  // Show the features with animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setFeaturesVisible(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  const rotatingTexts = [
    "Mortgage Loan Officers",
    "Real Estate Agents",
    "Debt Officers"
  ];
  
  // Define custom colors for each text
  const textColors = ["text-crm-blue", "text-purple-500", "text-orange-500"];
  
  // Define floating feature cards
  const floatingFeatureCards = [
    {
      id: 1,
      component: (
        <FeatureCard 
          title="Integrated Dialer" 
          value="Make Calls" 
          icon={
            <Phone size={20} className="text-blue-400" />
          } 
        />
      ),
      initialX: -220,
      initialY: 40,
      floatRadius: 20,
      floatSpeed: 0.002,
      delay: 0,
      zIndex: 10,
    },
    {
      id: 2,
      component: (
        <FeatureCard 
          title="AI Assistance" 
          value="Smart Support" 
          icon={
            <Bot size={20} className="text-purple-400" />
          } 
        />
      ),
      initialX: 0,
      initialY: 0,
      floatRadius: 25,
      floatSpeed: 0.0015,
      delay: 200,
      zIndex: 10,
    },
    {
      id: 3,
      component: (
        <FeatureCard 
          title="Sales Analytics" 
          value="Data Insights" 
          icon={
            <LineChart size={20} className="text-green-400" />
          } 
        />
      ),
      initialX: 220,
      initialY: 40,
      floatRadius: 30,
      floatSpeed: 0.0025,
      delay: 400,
      zIndex: 10,
    },
  ];
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 py-16 bg-gradient-to-b from-blue-900 to-slate-900 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.12)_0%,rgba(30,58,138,0)_70%)] z-0"></div>
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-900 to-transparent z-10"></div>
        </div>
        
        {/* Floating animations */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <FloatingAnimation items={floatingFeatureCards} className="h-full" />
        </div>
        
        <div className="w-full max-w-4xl text-center space-y-8 relative z-20">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 flex items-center justify-center bg-crm-blue text-white rounded-xl">
              <span className="font-bold text-2xl">CRM</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white">
              Best CRM for:
            </h1>
            <AnimatedText texts={rotatingTexts} colors={textColors} />
          </div>
          
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mt-8">
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
                <div 
                  key={i} 
                  className={`bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 transition-all duration-700 ease-out transform ${
                    featuresVisible 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-0 scale-0'
                  }`}
                  style={{ 
                    transitionDelay: `${i * 200}ms` 
                  }}
                >
                  <h3 className="text-xl font-semibold mb-3 text-white">{feature}</h3>
                  <p className="text-gray-300">
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
