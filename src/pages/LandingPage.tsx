import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AnimatedText from "@/components/AnimatedText";
import FloatingAnimation from "@/components/FloatingAnimation";
import { FeatureCard } from "@/components/FloatingCards";
import { Phone, Bot, LineChart, MessageSquare, Zap, Inbox } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu";
import { MockCRMInterface } from "@/components/demo/MockCRMInterface";

const CategoryCard = ({
  bgColor,
  title,
  subtitle,
  description,
  icon,
}: {
  bgColor: string;
  title: string;
  subtitle: string;
  description: string;
  icon?: React.ReactNode;
}) => (
  <div
    className={`rounded-2xl p-8 shadow-lg text-white flex flex-col items-start transition-transform duration-200 hover:scale-105`}
    style={{ background: bgColor }}
  >
    <div className="mb-4 text-3xl">{icon}</div>
    <div className="font-bold text-2xl mb-2">{title}</div>
    <div className="mb-2 text-sm opacity-80">{subtitle}</div>
    <div className="text-white/90">{description}</div>
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<'mortgage' | 'realEstate' | 'debtSettlement'>('mortgage');

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
      initialX: -450,
      initialY: -380,
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
      initialX: 450,
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
            className="w-48"
          />
        </div>
      ),
      initialX: 450,
      initialY: -20,
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
      initialX: -450,
      initialY: -180,
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
      initialX: 450,
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
      initialX: -450,
      initialY: -20,
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

  const section2Content = (
    <div
      className="
        w-[90vw] max-w-6xl bg-white rounded-3xl shadow-2xl mx-auto my-0 flex flex-col items-center justify-center
        min-h-[85vh] 
        relative z-40 border border-gray-100 transition-shadow
        -top-1
      "
    >
      <div className="w-full px-6 py-12 flex flex-col items-center justify-center h-full">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Experience Our Industry-Specific CRM</h2>
        <p className="text-lg text-gray-500 text-center mb-8 max-w-2xl">
          See how our CRM adapts to different industries. Click on the cards below to preview each version.
        </p>
        <MockCRMInterface industry={selectedIndustry} />
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{
        background: "linear-gradient(to bottom, #1e3a8a 0%, #111827 100%)",
      }}
    >
      
          
          
          
              
                  
                      CRM
                  
                  SalesPro
              
              
                  
                      
                          How It Works
                      
                          Features
                      
                          Plans
                      
                          Mortgage
                      
                          Real Estate
                      
                          Debt Settlement
                      
                      
                          Sign In
                      
                  
              
          

          
              
              
              
          
          
              
          
          
                      CRM
                  
                  SalesPro
              
              
                  Best CRM for:
                  
                  
              
              
                  CRM, dialer, LOS, and intelligent automation agents that move every transaction from lead to close
              
              
                  
                      
                      
                          Start Calling
                      
                  
              
              
                      
                          
                              
                                  
                                  
                              
                          
                          
                              
                                  
                                  
                              
                          
                          
                              
                                  
                                  
                              
                          
                      
                  
              
          
          
              
          
        
        
            
        
        
              
          
      
      
          
              
                  
                      
                          
                              
                                  
                                  
                              
                          
                          
                              
                                  
                                  
                              
                          
                          
                              
                                  
                                  
                              
                          
                      
                  
              
          

          
            
          
          
              
          
      
      <section
        className="relative flex flex-col items-center pt-0 snap-start"
        style={{
          minHeight: "100vh",
        }}
      >
        <div 
          className="w-full flex justify-center items-start"
          style={{
            marginTop: '-6vh',
            position: 'sticky',
            top: '5vh',
            zIndex: 40,
          }}
        >
          {section2Content}
        </div>

        <div className="max-w-6xl w-full mx-auto mt-10 px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
            <div onClick={() => setSelectedIndustry('mortgage')} className="cursor-pointer">
              <CategoryCard
                bgColor={selectedIndustry === 'mortgage' ? '#1EAEDB' : 'rgba(30, 174, 219, 0.8)'}
                title="Mortgage CRM"
                subtitle="For Modern Mortgage Teams"
                description="Automate nurture, compliance, and lead follow-up across multiple channels. Seamlessly manage borrowers, agents, and pipeline from prospect to funded."
              />
            </div>
            <div onClick={() => setSelectedIndustry('realEstate')} className="cursor-pointer">
              <CategoryCard
                bgColor={selectedIndustry === 'realEstate' ? 'rgb(185, 147, 214)' : 'rgba(185, 147, 214, 0.8)'}
                title="Real Estate CRM"
                subtitle="Built for Real Estate Agents"
                description="Centralize all prospects and automate open house follow-up, appointment reminders, and client communication. Track deals with real-time analytics."
              />
            </div>
            <div onClick={() => setSelectedIndustry('debtSettlement')} className="cursor-pointer">
              <CategoryCard
                bgColor={selectedIndustry === 'debtSettlement' ? 'rgb(17, 153, 142)' : 'rgba(17, 153, 142, 0.8)'}
                title="Debt Settlement CRM"
                subtitle="Empower Debt Relief Teams"
                description="Organize client onboarding, automate document collection, and streamline settlement offer management—all in one place."
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
