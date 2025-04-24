
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const AuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        console.log('Auth redirect page loaded. Checking session...');
        
        // Using getSession for reliable session handling - matches how other working flows handle auth
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          throw error;
        }
        
        if (data?.session) {
          console.log('Session found, user authenticated:', data.session.user.email);
          
          // Clean up the URL without losing the session
          window.history.replaceState(null, document.title, window.location.pathname);
          
          toast({
            title: 'Successfully signed in',
            description: `Welcome${data.session.user.user_metadata.name ? ', ' + data.session.user.user_metadata.name : ''}!`,
          });
          
          navigate('/settings');
          return;
        }

        console.log('No session found, redirecting to auth page');
        navigate('/auth');
      } catch (error: any) {
        console.error('Auth redirect error:', error);
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: error.message || 'An unexpected error occurred. Please try signing in again.',
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
