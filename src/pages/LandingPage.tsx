
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedText from "@/components/AnimatedText";
import FloatingAnimation from "@/components/FloatingAnimation";
import { FeatureCard } from "@/components/FloatingCards";
import { Phone, Bot, LineChart, MessageSquare, Calendar, FileCheck } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setFeaturesVisible(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        const newProgress = prev + 1;
        return newProgress > 400 ? 0 : newProgress;
      });
    }, 30);
    
    return () => clearInterval(interval);
  }, []);
  
  const rotatingTexts = [
    "Mortgage Loan Officers",
    "Real Estate Agents",
    "Debt Officers"
  ];
  
  const textColors = ["text-crm-blue", "text-purple-500", "text-orange-500"];
  
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
      initialX: -380,
      initialY: 150,
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
      initialX: 380,
      initialY: 80,
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
      initialX: 380,
      initialY: 220,
      floatRadius: 30,
      floatSpeed: 0.0025,
      delay: 400,
      zIndex: 10,
    },
    {
      id: 4,
      component: (
        <FeatureCard 
          title="SMS Campaigns" 
          value="Bulk Messaging" 
          icon={
            <MessageSquare size={20} className="text-orange-400" />
          } 
        />
      ),
      initialX: -330,
      initialY: 50,
      floatRadius: 22,
      floatSpeed: 0.002,
      delay: 300,
      zIndex: 10,
    },
    {
      id: 5,
      component: (
        <FeatureCard 
          title="Appointment Scheduling" 
          value="Smart Calendar" 
          icon={
            <Calendar size={20} className="text-blue-500" />
          } 
        />
      ),
      initialX: -280,
      initialY: 250,
      floatRadius: 18,
      floatSpeed: 0.0018,
      delay: 150,
      zIndex: 10,
    },
  ];

  const getLoadingPosition = (progress) => {
    const width = 300;
    const height = 56;
    const borderRadius = 10;

    const topEdge = width - 2 * borderRadius;
    const rightEdge = height - 2 * borderRadius;
    const bottomEdge = width - 2 * borderRadius;
    const leftEdge = height - 2 * borderRadius;

    const cornerArcLength = (Math.PI / 2) * borderRadius;
    const perimeter =
      topEdge + rightEdge + bottomEdge + leftEdge + 4 * cornerArcLength;

    const p = (progress / 400) * perimeter;

    let x = 0, y = 0;

    if (p < topEdge) {
      x = borderRadius + p;
      y = 0;
    } else if (p < topEdge + cornerArcLength) {
      const angle = ((p - topEdge) / cornerArcLength) * (Math.PI / 2);
      x = width - borderRadius + Math.sin(angle) * borderRadius;
      y = borderRadius - Math.cos(angle) * borderRadius;
    } else if (p < topEdge + cornerArcLength + rightEdge) {
      x = width;
      y = borderRadius + (p - topEdge - cornerArcLength);
    } else if (p < topEdge + 2 * cornerArcLength + rightEdge) {
      const angle = ((p - topEdge - cornerArcLength - rightEdge) / cornerArcLength) * (Math.PI / 2);
      x = width - borderRadius + Math.cos(angle) * -borderRadius;
      y = height - borderRadius + Math.sin(angle) * borderRadius;
    } else if (p < topEdge + 2 * cornerArcLength + rightEdge + bottomEdge) {
      x = width - borderRadius - (p - topEdge - 2 * cornerArcLength - rightEdge);
      y = height;
    } else if (p < topEdge + 3 * cornerArcLength + rightEdge + bottomEdge) {
      const angle = ((p - topEdge - 2 * cornerArcLength - rightEdge - bottomEdge) / cornerArcLength) * (Math.PI / 2);
      x = borderRadius - Math.sin(angle) * borderRadius;
      y = height - borderRadius + Math.cos(angle) * -borderRadius;
    } else if (p < topEdge + 3 * cornerArcLength + rightEdge + bottomEdge + leftEdge) {
      x = 0;
      y = height - borderRadius - (p - topEdge - 3 * cornerArcLength - rightEdge - bottomEdge);
    } else {
      const angle = ((p - topEdge - 3 * cornerArcLength - rightEdge - bottomEdge - leftEdge) / cornerArcLength) * (Math.PI / 2);
      x = borderRadius - Math.cos(angle) * borderRadius;
      y = borderRadius - Math.sin(angle) * borderRadius;
    }

    return { x, y };
  };
  
  const loadingPos = getLoadingPosition(loadingProgress);
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 py-16 bg-gradient-to-b from-blue-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.12)_0%,rgba(30,58,138,0)_70%)] z-0"></div>
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-900 to-transparent z-10"></div>
        </div>
        
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
            <div className="relative mx-auto w-[300px]">
              <div className="absolute inset-0 rounded-xl border-2 border-crm-blue/30 backdrop-blur-sm shadow-[0_0_15px_5px_rgba(51,195,240,0.3)]"></div>
              
              {[...Array(50)].map((_, i) => {
                const trailSegmentOffset = i * 4;
                const trailPos = getLoadingPosition((loadingProgress - trailSegmentOffset + 400) % 400);
                
                return (
                  <div 
                    key={i}
                    className="absolute rounded-full z-20"
                    style={{
                      left: `${trailPos.x}px`,
                      top: `${trailPos.y}px`,
                      width: `${Math.max(4.5 - i * 0.07, 1)}px`,
                      height: `${Math.max(4.5 - i * 0.07, 1)}px`,
                      opacity: `${Math.max(1 - i * 0.02, 0)}`,
                      transform: `translate(-50%, -50%)`,
                      background: "radial-gradient(circle, rgba(51,195,240,1) 0%, rgba(51,195,240,0.6) 50%, rgba(51,195,240,0) 100%)",
                      boxShadow: `0 0 ${20 - i * 0.3}px ${8 - i * 0.1}px rgba(51,195,240,${Math.max(0.9 - i * 0.015, 0)})`,
                    }}
                  ></div>
                );
              })}

              <Button 
                onClick={() => navigate("/auth")}
                className="w-full text-lg py-6 h-auto bg-crm-blue hover:bg-crm-blue/90 relative z-10 font-bold tracking-wide shadow-[inset_0_0_12px_rgba(255,255,255,0.6),0_0_15px_rgba(51,195,240,0.7)]"
              >
                Start Calling
              </Button>
            </div>
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
