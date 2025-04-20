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
            <h1 className="text-7xl font-bold mb-8 leading-tight">
              The world's first{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI-Powered
              </span>
              {" "}loan officer
            </h1>
            <div className="relative mb-2">
              <BurningStarUnderline width={600} />
            </div>
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

      <section className="pt-64 md:pt-72 pb-24 px-4 bg-gradient-to-br from-blue-950 to-blue-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">Everything You Need in One Place</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
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
