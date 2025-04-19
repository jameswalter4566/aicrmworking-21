
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPortalAccess, updateLastAccessed } from '@/utils/clientPortalUtils';

interface ClientPortalLandingProps {
  slug: string;
  token: string;
}

export const ClientPortalLanding = ({ slug, token }: ClientPortalLandingProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Your Mortgage Company');
  const [leadName, setLeadName] = useState('');

  useEffect(() => {
    const validateAccess = async () => {
      if (!slug || !token) {
        setError('Invalid portal link');
        setLoading(false);
        return;
      }

      try {
        // Verify access token
        const { access, error } = await getPortalAccess(slug, token);
        
        if (error || !access) {
          setError('Portal access has expired or is invalid');
          setLoading(false);
          return;
        }

        // Get lead information
        if (access.lead_id) {
          const { data: leadData } = await supabase
            .from('leads')
            .select('first_name, last_name')
            .eq('id', access.lead_id)
            .single();

          if (leadData) {
            setLeadName(`${leadData.first_name || ''} ${leadData.last_name || ''}`.trim());
          }

          // Get company name if we have a creator
          if (access.created_by) {
            const { data: companyData } = await supabase
              .from('company_settings')
              .select('company_name')
              .eq('user_id', access.created_by)
              .single();

            if (companyData?.company_name) {
              setCompanyName(companyData.company_name);
            }
          }
        }
        
        setLoading(false);

      } catch (err) {
        console.error('Error validating portal access:', err);
        setError('An error occurred while validating your portal access');
        setLoading(false);
      }
    };

    validateAccess();
  }, [slug, token]);

  const handleEnterPortal = async () => {
    if (!slug || !token) return;

    try {
      // Update the last_accessed timestamp
      const { access } = await getPortalAccess(slug, token);
      if (access?.id) {
        await updateLastAccessed(access.id);
      }
      
      // Navigate to the client portal
      navigate(`/client-portal/${slug}?token=${token}`);
    } catch (err) {
      console.error('Error updating last accessed:', err);
      // Still navigate even if updating last accessed fails
      navigate(`/client-portal/${slug}?token=${token}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>Verifying your portal access...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Access Error</CardTitle>
          <CardDescription className="text-center">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p>If you believe this is an error, please contact your loan officer.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{companyName}</CardTitle>
        <CardDescription>
          Secure Client Mortgage Portal
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
          <p className="text-base">
            {leadName ? (
              <>Welcome, <span className="font-semibold">{leadName}</span></>
            ) : (
              <>Welcome to your Mortgage Portal</>
            )}
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm">Track your mortgage application progress</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm">Upload required documents securely</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm">Easy communication with your loan officer</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleEnterPortal} 
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Enter Portal <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
