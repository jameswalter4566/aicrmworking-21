import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Shield, Clock, FileCheck, PieChart, Loader2 } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getPortalAccess, updateLastAccessed } from '@/utils/clientPortalUtils';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import GlowingCard from '@/components/GlowingCard';
import BurningStarUnderline from '@/components/BurningStarUnderline';
import InfoCard from './InfoCard';

const ClientPortalLanding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isValidating, setIsValidating] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [portalAccess, setPortalAccess] = useState<any>(null);

  const getPortalSlug = () => {
    const pathParts = location.pathname.split('/');
    if (pathParts.length > 2 && pathParts[1] === 'client-portal') {
      return pathParts[2];
    }
    return '';
  };

  const slug = getPortalSlug();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      setAccessToken(token);
    }
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    const validateToken = async () => {
      if (slug && token && !isValidating && !isLoading) {
        try {
          const { access, error } = await getPortalAccess(slug, token);
          
          if (access) {
            console.log("Token validated successfully", access);
            setPortalAccess(access);
            
            if (access.id) {
              await updateLastAccessed(access.id);
            }
          }
        } catch (error) {
          console.error("Token validation error:", error);
        }
      }
    };
    
    validateToken();
  }, [slug, token, isLoading, isValidating]);

  const navigationOptions = [
    { label: 'Buy', path: '/client-portal/onboarding' },
    { label: 'Refinance', path: '/client-portal/onboarding' },
    { label: 'HELOC', path: '/client-portal/onboarding' },
    { label: 'Rates', path: '/client-portal/onboarding' }
  ];

  const handleEnterPortal = async () => {
    if (slug) {
      if (accessToken) {
        setIsValidating(true);
        
        try {
          const { access, error } = await getPortalAccess(slug, accessToken);
          
          if (access) {
            const leadId = access.lead_id;
            
            if (access.lead_id) {
              const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .select('is_mortgage_lead, added_to_pipeline_at')
                .eq('id', access.lead_id)
                .single();
              
              if (!leadError && leadData) {
                if (leadData.is_mortgage_lead) {
                  navigate(`/client-portal/dashboard/${slug}?token=${accessToken}`);
                } else {
                  navigate(`/client-portal/onboarding/${slug}?token=${accessToken}`);
                }
              } else {
                navigate(`/client-portal/onboarding/${slug}?token=${accessToken}`);
              }
            } else {
              navigate(`/client-portal/onboarding/${slug}?token=${accessToken}`);
            }
          } else {
            toast({
              title: "Access Error",
              description: error || "Invalid access credentials",
              variant: "destructive"
            });
            
            navigate('/client-portal/dashboard');
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Could not validate portal access",
            variant: "destructive"
          });
          navigate('/client-portal/dashboard');
        } finally {
          setIsValidating(false);
        }
      } else {
        navigate(`/client-portal/dashboard/${slug}`);
      }
    } else {
      navigate('/client-portal/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 size={48} className="animate-spin text-emerald-500 mb-4" />
          <p className="text-lg">Loading your portal access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="absolute top-0 left-0 right-0 z-50 py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <ul className="flex justify-center space-x-8">
            {navigationOptions.map((option) => (
              <li key={option.label}>
                <button 
                  onClick={() => navigate(option.path)}
                  className="px-6 py-2 rounded-full text-white transition-all duration-300 hover:bg-white hover:text-blue-900 font-medium"
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-blue-900 to-blue-950 text-white px-4 min-h-screen flex items-center justify-center relative">
        <div className="max-w-6xl mx-auto relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-7xl font-bold mb-4 leading-tight">
              <div className="mb-2">The world's first</div>
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI-Powered
              </span>
              {" "}loan officer
            </h1>
            <div className="relative mb-4">
              <BurningStarUnderline width={600} />
            </div>
            <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
              Experience mortgage lending reimagined with advanced AI technology, 
              providing personalized service 24/7 for your home financing needs.
            </p>
            <Button 
              size="lg"
              onClick={handleEnterPortal}
              className="glow-button bg-blue-600 hover:bg-blue-700 text-white px-12 py-6 text-xl rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(59,130,246,0.7)] mb-32 md:mb-48 relative z-10"
              disabled={isValidating}
            >
              {isValidating ? 'Validating Access...' : 'Access Your Portal'}
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </div>
        
        <div className="absolute -bottom-48 md:-bottom-56 left-0 right-0 w-full flex justify-center px-4">
          <div className="max-w-6xl w-full bg-white rounded-2xl shadow-2xl p-4 transform transition-all duration-500 ease-in-out hover:scale-[1.02]">
            <img 
              src="/clientportalscreenshot.jpg" 
              alt="Client Portal Interface" 
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      </section>

      <section className="pt-96 md:pt-120 pb-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 text-white">Everything You Need in One Place</h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-24">
            <GlowingCard
              title="Secure Access"
              description="Bank-level security protects your sensitive information while providing easy access to your documents."
              gradient="bg-purple-glow"
              icon={<Shield className="h-6 w-6 text-blue-200" />}
              delay="delay-1"
            />

            <GlowingCard
              title="Real-Time Updates"
              description="Track your loan's progress in real-time and get instant notifications about important milestones."
              gradient="bg-green-glow"
              icon={<PieChart className="h-6 w-6 text-blue-200" />}
              delay="delay-2"
            />

            <GlowingCard
              title="Document Management"
              description="Upload, sign, and manage all your loan documents in one centralized, easy-to-use platform."
              gradient="bg-blue-glow"
              icon={<FileCheck className="h-6 w-6 text-blue-200" />}
              delay="delay-3"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-96">
            <div className="lg:col-span-8 bg-[#F1F0FB] rounded-3xl p-16 shadow-xl min-h-[800px]">
              <div className="mb-16 text-center">
                <h2 className="text-5xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                  Revolutionizing Mortgage Lending with AI
                </h2>
                <p className="text-gray-600 mb-16 text-xl max-w-4xl mx-auto leading-relaxed">
                  Experience a smarter way to get your mortgage. Our AI-powered platform 
                  eliminates the traditional hassles and delays, providing you with 
                  instant service and optimal rates.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="md:col-span-1 space-y-8">
                  <InfoCard 
                    title="24/7 Support, Even on Weekends"
                    description="Text, call, or email your loan advisor 7 days a week. Day or night, on your schedule and receive an instant response."
                  />
                  <InfoCard 
                    title="AI-Powered Rate Shopping"
                    description="We use AI to analyze the top mortgage lenders in the nation to ensure we are shopping for the best possible rate and closing costs."
                  />
                </div>

                <div className="md:col-span-1 mt-24">
                  <InfoCard 
                    title="Stress-Free Mortgage Process"
                    description="No more stress involved in the mortgage process! No more dealing with a loan officer - our AI agent does all of the work for you!"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-white rounded-3xl min-h-[700px] shadow-lg">
              {/* Image placeholder - will be added later */}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Ready to Get Started?</h2>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Access your personalized mortgage portal to track your loan progress, 
            upload documents, and stay connected with your loan team.
          </p>
          <Button
            size="lg"
            onClick={handleEnterPortal}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isValidating}
          >
            {isValidating ? 'Validating Access...' : 'Enter Portal'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <footer className="bg-blue-950 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-blue-200">
            © {new Date().getFullYear()} Mortgage Client Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortalLanding;
