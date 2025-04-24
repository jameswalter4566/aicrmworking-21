
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const AuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        console.log('Auth redirect page loaded. Checking session...');
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: error.message || 'Failed to complete authentication.',
          });
          navigate('/auth');
          return;
        }
        
        if (data?.session) {
          console.log('Session found, redirecting to settings');
          toast({
            title: 'Successfully signed in',
            description: `Welcome${data.session.user.user_metadata.name ? ', ' + data.session.user.user_metadata.name : ''}!`,
          });
          navigate('/settings');
        } else {
          console.log('No session found, redirecting to auth page');
          navigate('/auth');
        }
      } catch (error) {
        console.error('Unexpected error during redirect handling:', error);
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: 'An unexpected error occurred. Please try signing in again.',
        });
        navigate('/auth');
      }
    };
    
    handleRedirect();
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-lg text-white">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthRedirect;
