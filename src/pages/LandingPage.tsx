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
  ];

  const getLoadingPosition = (progress) => {
    const width = 240;
    const height = 56;
    const borderRadius = 10;
    
    const perimeter = 2 * (width + height - 4 * borderRadius) + 2 * Math.PI * borderRadius;
    
    const p = (progress / 400) * perimeter;
    
    let x = 0, y = 0;
    
    const topEdgeLength = width - 2 * borderRadius;
    if (p < topEdgeLength) {
      x = borderRadius + p;
      y = 0;
      return { x, y };
    }
    
    const trCornerStart = topEdgeLength;
    const trCornerLength = Math.PI * borderRadius / 2;
    if (p < trCornerStart + trCornerLength) {
      const angle = (p - trCornerStart) / trCornerLength * (Math.PI / 2);
      x = width - borderRadius + Math.sin(angle) * borderRadius;
      y = borderRadius - Math.cos(angle) * borderRadius;
      return { x, y };
    }
    
    const rightEdgeStart = trCornerStart + trCornerLength;
    const rightEdgeLength = height - 2 * borderRadius;
    if (p < rightEdgeStart + rightEdgeLength) {
      x = width;
      y = borderRadius + (p - rightEdgeStart);
      return { x, y };
    }
    
    const brCornerStart = rightEdgeStart + rightEdgeLength;
    const brCornerLength = Math.PI * borderRadius / 2;
    if (p < brCornerStart + brCornerLength) {
      const angle = (p - brCornerStart) / brCornerLength * (Math.PI / 2);
      x = width - borderRadius + Math.cos(angle) * borderRadius;
      y = height - borderRadius + Math.sin(angle) * borderRadius;
      return { x, y };
    }
    
    const bottomEdgeStart = brCornerStart + brCornerLength;
    const bottomEdgeLength = width - 2 * borderRadius;
    if (p < bottomEdgeStart + bottomEdgeLength) {
      x = width - (p - bottomEdgeStart) - borderRadius;
      y = height;
      return { x, y };
    }
    
    const blCornerStart = bottomEdgeStart + bottomEdgeLength;
    const blCornerLength = Math.PI * borderRadius / 2;
    if (p < blCornerStart + blCornerLength) {
      const angle = (p - blCornerStart) / blCornerLength * (Math.PI / 2);
      x = borderRadius - Math.sin(angle) * borderRadius;
      y = height - borderRadius + Math.cos(angle) * borderRadius;
      return { x, y };
    }
    
    const leftEdgeStart = blCornerStart + blCornerLength;
    const leftEdgeLength = height - 2 * borderRadius;
    if (p < leftEdgeStart + leftEdgeLength) {
      x = 0;
      y = height - (p - leftEdgeStart) - borderRadius;
      return { x, y };
    }
    
    const tlCornerStart = leftEdgeStart + leftEdgeLength;
    const tlCornerLength = Math.PI * borderRadius / 2;
    if (p < tlCornerStart + tlCornerLength) {
      const angle = (p - tlCornerStart) / tlCornerLength * (Math.PI / 2);
      x = borderRadius - Math.cos(angle) * borderRadius;
      y = borderRadius - Math.sin(angle) * borderRadius;
      return { x, y };
    }
    
    return { x: 0, y: 0 };
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
            <div className="relative mx-auto w-60">
              <div className="absolute inset-0 rounded-xl border-2 border-crm-blue/30 backdrop-blur-sm"></div>
              
              <div 
                className="absolute z-20"
                style={{ 
                  left: `${loadingPos.x}px`, 
                  top: `${loadingPos.y}px`,
                  transition: "left 0.03s linear, top 0.03s linear",
                }}
              >
                <div 
                  className="absolute top-0 left-0 rounded-full w-4 h-4 -ml-2 -mt-2"
                  style={{
                    background: "radial-gradient(circle, rgba(51,195,240,1) 0%, rgba(51,195,240,0.7) 40%, rgba(51,195,240,0) 70%)",
                    boxShadow: "0 0 20px 6px rgba(51,195,240,0.9), 0 0 40px 20px rgba(51,195,240,0.5)",
                    animation: "pulse 1.5s ease-in-out infinite"
                  }}
                ></div>
              </div>
              
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
                      width: `${Math.max(3.5 - i * 0.07, 0.8)}px`,
                      height: `${Math.max(3.5 - i * 0.07, 0.8)}px`,
                      opacity: `${Math.max(1 - i * 0.02, 0)}`,
                      transform: `translate(-50%, -50%)`,
                      background: "radial-gradient(circle, rgba(51,195,240,1) 0%, rgba(51,195,240,0.5) 50%, rgba(51,195,240,0) 100%)",
                      boxShadow: `0 0 ${15 - i * 0.3}px ${5 - i * 0.1}px rgba(51,195,240,${Math.max(0.8 - i * 0.015, 0)})`,
                    }}
                  ></div>
                );
              })}

              <Button 
                onClick={() => navigate("/auth")}
                className="w-full text-lg py-6 h-auto bg-crm-blue hover:bg-crm-blue/90 relative z-10"
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
