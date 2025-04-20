import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Shield, Clock, FileCheck, PieChart, Loader2 } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getPortalAccess, updateLastAccessed } from '@/utils/clientPortalUtils';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
      <section className="bg-gradient-to-br from-blue-900 to-blue-950 text-white px-4 py-32">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl font-bold mb-6 leading-tight">
              Smart Mortgage Processing{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Powered by AI
              </span>
            </h1>
            <p className="text-2xl mb-8 text-gray-200">
              Our technology streamlines your mortgage journey with faster approvals, 
              transparent processing, and 24/7 access to your loan status.
            </p>
            <Button 
              size="lg"
              onClick={handleEnterPortal}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isValidating}
            >
              {isValidating ? 'Validating Access...' : 'Access Your Portal'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="mt-4 text-sm text-gray-300 flex items-center justify-center">
              <Clock className="h-4 w-4 mr-2" />
              Average processing time: 2-3 weeks faster than traditional lenders
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-br from-blue-950 to-blue-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">Everything You Need in One Place</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 bg-blue-800/30 border-blue-700/50 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-lg bg-blue-700/50 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-blue-200" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Secure Access</h3>
              <p className="text-blue-200">
                Bank-level security protects your sensitive information while providing 
                easy access to your documents.
              </p>
            </Card>

            <Card className="p-6 bg-blue-800/30 border-blue-700/50 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-lg bg-blue-700/50 flex items-center justify-center mb-4">
                <PieChart className="h-6 w-6 text-blue-200" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Real-Time Updates</h3>
              <p className="text-blue-200">
                Track your loan's progress in real-time and get instant notifications 
                about important milestones.
              </p>
            </Card>

            <Card className="p-6 bg-blue-800/30 border-blue-700/50 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-lg bg-blue-700/50 flex items-center justify-center mb-4">
                <FileCheck className="h-6 w-6 text-blue-200" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Document Management</h3>
              <p className="text-blue-200">
                Upload, sign, and manage all your loan documents in one centralized, 
                easy-to-use platform.
              </p>
            </Card>
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
