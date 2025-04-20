
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
  
  // Extract slug from the URL if present
  const getPortalSlug = () => {
    const pathParts = location.pathname.split('/');
    if (pathParts.length > 2 && pathParts[1] === 'client-portal') {
      return pathParts[2];
    }
    return '';
  };
  
  const slug = getPortalSlug();
  const token = searchParams.get('token');
  
  // Check if token is in URL params and store it
  useEffect(() => {
    if (token) {
      setAccessToken(token);
    }
    setIsLoading(false);
  }, [token]);
  
  // Validate token when landing page loads if we have both a slug and token
  useEffect(() => {
    const validateToken = async () => {
      if (slug && token && !isValidating && !isLoading) {
        // Auto-validate the token on page load, but don't auto-redirect
        try {
          const { access, error } = await getPortalAccess(slug, token);
          
          if (access) {
            // Token is valid, but we don't auto-redirect - user must click the button
            console.log("Token validated successfully", access);
            setPortalAccess(access);
            
            // Update last accessed timestamp
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
      // If we have both slug and token, validate access
      if (accessToken) {
        setIsValidating(true);
        
        try {
          const { access, error } = await getPortalAccess(slug, accessToken);
          
          if (access) {
            // Get lead information from portal access
            const leadId = access.lead_id;
            
            // Check if we have a lead in the mortgage pipeline
            if (access.lead_id) {
              // Fetch the lead data to check if it's a mortgage lead
              const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .select('is_mortgage_lead, added_to_pipeline_at')
                .eq('id', access.lead_id)
                .single();
              
              if (!leadError && leadData) {
                if (leadData.is_mortgage_lead) {
                  // Lead is in mortgage pipeline, navigate to dashboard
                  navigate(`/client-portal/dashboard/${slug}?token=${accessToken}`);
                } else {
                  // Lead is NOT in pipeline, navigate to onboarding sequence
                  navigate(`/client-portal/onboarding/${slug}?token=${accessToken}`);
                }
              } else {
                // Error fetching lead or lead doesn't exist, go to onboarding
                navigate(`/client-portal/onboarding/${slug}?token=${accessToken}`);
              }
            } else {
              // No lead ID, go to the onboarding sequence
              navigate(`/client-portal/onboarding/${slug}?token=${accessToken}`);
            }
          } else {
            // Invalid access
            toast({
              title: "Access Error",
              description: error || "Invalid access credentials",
              variant: "destructive"
            });
            
            // Navigate to general dashboard without specific access
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
        // No token but we have slug, go to dashboard input page
        navigate(`/client-portal/dashboard/${slug}`);
      }
    } else {
      // If no slug is found, go to login page where they can enter credentials
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
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-800 to-green-900 text-white px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              Smart Mortgage Processing
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"> Powered by AI</span>
            </h1>
            <p className="text-xl mb-8 text-gray-100">
              Our technology streamlines your mortgage journey with faster approvals, 
              transparent processing, and 24/7 access to your loan status.
            </p>
            <Button 
              size="lg"
              onClick={handleEnterPortal}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={isValidating}
            >
              {isValidating ? 'Validating Access...' : 'Access Your Portal'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="mt-4 text-sm text-gray-200 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Average processing time: 2-3 weeks faster than traditional lenders
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need in One Place</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Access</h3>
              <p className="text-gray-600">
                Bank-level security protects your sensitive information while providing 
                easy access to your documents.
              </p>
            </Card>

            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                <PieChart className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Updates</h3>
              <p className="text-gray-600">
                Track your loan's progress in real-time and get instant notifications 
                about important milestones.
              </p>
            </Card>

            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                <FileCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Document Management</h3>
              <p className="text-gray-600">
                Upload, sign, and manage all your loan documents in one centralized, 
                easy-to-use platform.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Access your personalized mortgage portal to track your loan progress, 
            upload documents, and stay connected with your loan team.
          </p>
          <Button
            size="lg"
            onClick={handleEnterPortal}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={isValidating}
          >
            {isValidating ? 'Validating Access...' : 'Enter Portal'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm opacity-75">
            © {new Date().getFullYear()} Mortgage Client Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortalLanding;
