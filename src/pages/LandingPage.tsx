
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedText from "@/components/AnimatedText";
import FloatingAnimation from "@/components/FloatingAnimation";
import { FeatureCard } from "@/components/FloatingCards";
import { Phone, Bot, LineChart, MessageSquare, FileCheck, Zap, Inbox } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu";

const LandingPage = () => {
  const navigate = useNavigate();
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setFeaturesVisible(true);
    }, 300);
    
    setIsActive(true);
    
    return () => {
      clearTimeout(timer);
      setIsActive(false);
    };
  }, []);
  
  useEffect(() => {
    if (!isActive) return;
    
    let animationId: number;
    let lastTimestamp = 0;
    
    const updateProgress = (timestamp: number) => {
      if (!isActive) return;
      
      if (timestamp - lastTimestamp >= 30) {
        setLoadingProgress(prev => {
          const newProgress = prev + 1;
          return newProgress > 400 ? 0 : newProgress;
        });
        lastTimestamp = timestamp;
      }
      
      animationId = requestAnimationFrame(updateProgress);
    };
    
    animationId = requestAnimationFrame(updateProgress);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive]);
  
  const rotatingTexts = [
    "Mortgage Loan Officers",
    "Real Estate Agents",
    "Debt Officers"
  ];
  
  const textColors = ["text-crm-blue", "text-purple-500", "text-orange-500"];

  const navigateToAuth = () => {
    navigate("/auth");
  };

  const floatingFeatureCards = React.useMemo(() => [
    {
      id: 1,
      component: (
        <div onClick={navigateToAuth} className="cursor-pointer">
          <FeatureCard 
            title="Integrated Dialer" 
            value="Make Calls" 
            icon={
              <Phone size={20} className="text-blue-400" />
            } 
          />
        </div>
      ),
      initialX: -750,
      initialY: -280, // Adjusted from 280 to -280 to move higher
      floatRadius: 20,
      floatSpeed: 0.002,
      delay: 0,
      zIndex: 10,
    },
    {
      id: 2,
      component: (
        <div onClick={navigateToAuth} className="cursor-pointer">
          <FeatureCard 
            title="AI Assistance" 
            value="Smart Support" 
            icon={
              <Bot size={20} className="text-purple-400" />
            } 
          />
        </div>
      ),
      initialX: 750,
      initialY: -220,
      floatRadius: 25,
      floatSpeed: 0.0015,
      delay: 200,
      zIndex: 10,
    },
    {
      id: 3,
      component: (
        <div onClick={navigateToAuth} className="cursor-pointer">
          <FeatureCard 
            title="Sales Analytics" 
            value="Data Insights" 
            icon={
              <LineChart size={20} className="text-green-400" />
            } 
          />
        </div>
      ),
      initialX: 750,
      initialY: -20, // Adjusted from 380 to -20 to align with other containers
      floatRadius: 30,
      floatSpeed: 0.0025,
      delay: 400,
      zIndex: 10,
    },
    {
      id: 4,
      component: (
        <div onClick={navigateToAuth} className="cursor-pointer">
          <FeatureCard 
            title="SMS Campaigns" 
            value="Bulk Messaging" 
            icon={
              <MessageSquare size={20} className="text-orange-400" />
            } 
          />
        </div>
      ),
      initialX: -750,
      initialY: -220,
      floatRadius: 22,
      floatSpeed: 0.002,
      delay: 300,
      zIndex: 10,
    },
    {
      id: 6,
      component: (
        <div onClick={navigateToAuth} className="cursor-pointer">
          <FeatureCard 
            title="Power Dialer" 
            value="10-to-1 Calling" 
            icon={
              <Zap size={20} className="text-yellow-400" />
            } 
          />
        </div>
      ),
      initialX: 750,
      initialY: -380,
      floatRadius: 25,
      floatSpeed: 0.002,
      delay: 250,
      zIndex: 10,
    },
    {
      id: 7,
      component: (
        <div onClick={navigateToAuth} className="cursor-pointer">
          <FeatureCard 
            title="Lead Manager" 
            value="Organize Contacts" 
            icon={
              <Inbox size={20} className="text-purple-500" />
            } 
          />
        </div>
      ),
      initialX: -750,
      initialY: -380,
      floatRadius: 22,
      floatSpeed: 0.0018,
      delay: 200,
      zIndex: 10,
    },
  ], []);

  const getLoadingPosition = React.useCallback((progress: number) => {
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
  }, []);

  const loadingPos = isActive ? getLoadingPosition(loadingProgress) : { x: 0, y: 0 };

  const trailSegments = 20;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 py-16 bg-gradient-to-b from-blue-900 to-slate-900 relative overflow-hidden">
        <div className="fixed top-0 left-0 right-0 z-50 bg-transparent py-4 px-6">
          <div className="container mx-auto flex justify-center items-center">
            <div className="flex items-center absolute left-6" onClick={navigateToAuth}>
              <div className="h-10 w-10 flex items-center justify-center bg-crm-blue text-white rounded cursor-pointer">
                <span className="font-bold text-sm">CRM</span>
              </div>
              <span className="ml-2 text-lg font-semibold text-white enhanced-glow-text cursor-pointer">SalesPro</span>
            </div>
            
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList className="space-x-8">
                {["How It Works", "Features", "Plans", "Mortgage", "Real Estate", "Debt Settlement"].map((text) => (
                  <NavigationMenuItem key={text}>
                    <NavigationMenuLink 
                      onClick={navigateToAuth}
                      className="text-white hover:text-blue-200 transition-colors nav-link enhanced-glow-text cursor-pointer"
                    >
                      {text}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
                <NavigationMenuItem>
                  <Button 
                    onClick={navigateToAuth} 
                    variant="outline" 
                    className="bg-transparent text-white border-white hover:bg-white/10"
                  >
                    Sign In
                  </Button>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>

        <div className="absolute inset-0 z-0">
          <div className="absolute w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.2)_0%,rgba(30,58,138,0)_70%)] z-0"></div>
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-900 to-transparent z-10"></div>
        </div>
        
        <div className="absolute inset-0 z-10 pointer-events-none">
          {isActive && <FloatingAnimation items={floatingFeatureCards} className="h-full" />}
        </div>
        
        <div className="w-full max-w-4xl mx-auto text-center space-y-8 relative z-20 mt-20 flex flex-col items-center justify-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 flex items-center justify-center bg-crm-blue text-white rounded-xl">
              <span className="font-bold text-2xl">CRM</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white enhanced-glow-text">
              Best CRM for:
            </h1>
            <AnimatedText texts={rotatingTexts} colors={textColors} />
          </div>
          
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mt-8">
            The all-in-one CRM platform for managing leads, calls, and closing more deals.
          </p>
          
          <div className="pt-6">
            <div className="relative mx-auto w-[300px]">
              <div className="absolute inset-0 rounded-xl border-2 border-crm-blue/40 backdrop-blur-sm shadow-[0_0_20px_8px_rgba(51,195,240,0.4)]"></div>
              
              {isActive && [...Array(trailSegments)].map((_, i) => {
                const trailSegmentOffset = i * (400 / trailSegments);
                const trailPos = getLoadingPosition((loadingProgress - trailSegmentOffset + 400) % 400);
                
                return (
                  <div 
                    key={i}
                    className="absolute rounded-full z-20"
                    style={{
                      left: `${trailPos.x}px`,
                      top: `${trailPos.y}px`,
                      width: `${Math.max(5 - i * 0.15, 1.2)}px`,
                      height: `${Math.max(5 - i * 0.15, 1.2)}px`,
                      opacity: `${Math.max(1 - i * 0.04, 0)}`,
                      transform: `translate(-50%, -50%)`,
                      background: "radial-gradient(circle, rgba(51,195,240,1) 0%, rgba(51,195,240,0.7) 50%, rgba(51,195,240,0) 100%)",
                      boxShadow: i < 10 ? `0 0 ${25 - i * 0.8}px ${12 - i * 0.3}px rgba(51,195,240,${Math.max(0.95 - i * 0.04, 0)})` : 'none',
                      willChange: i < 5 ? 'left, top' : 'auto',
                    }}
                  ></div>
                );
              })}

              <Button 
                onClick={navigateToAuth}
                className="w-full text-lg py-6 h-auto bg-crm-blue hover:bg-crm-blue/90 relative z-10 font-extrabold tracking-wide shadow-[inset_0_0_15px_rgba(255,255,255,0.7),0_0_20px_rgba(51,195,240,0.8)]"
              >
                Start Calling
              </Button>
            </div>
          </div>
          
          <div className="pt-16" id="features">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Integrated Dialer",
                  description: "Streamline your workflow with our powerful auto-dialing system that increases productivity.",
                  icon: <Phone size={28} className="text-white" />,
                  gradient: "bg-purple-glow",
                  delay: "delay-1"
                },
                {
                  title: "AI Assistance",
                  description: "Leverage cutting-edge AI to automate tasks and gain valuable insights from customer interactions.",
                  icon: <Bot size={28} className="text-white" />,
                  gradient: "bg-green-glow",
                  delay: "delay-2"
                },
                {
                  title: "Sales Analytics",
                  description: "Track performance metrics and visualize your sales pipeline with comprehensive analytics.",
                  icon: <LineChart size={28} className="text-white" />,
                  gradient: "bg-blue-glow",
                  delay: "delay-3"
                }
              ].map((card) => (
                <div key={card.title} onClick={navigateToAuth} className="cursor-pointer">
                  <GlowingCard
                    title={card.title}
                    description={card.description}
                    icon={card.icon}
                    gradient={card.gradient}
                    delay={card.delay}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0" onClick={navigateToAuth}>
              <div className="h-10 w-10 flex items-center justify-center bg-white text-crm-blue rounded cursor-pointer">
                <span className="font-bold text-sm">CRM</span>
              </div>
              <span className="ml-2 text-lg font-semibold cursor-pointer">SalesPro</span>
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
