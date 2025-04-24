
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const AuthRedirect = () => {
  const navigate = useNavigate();
  const [processingAuth, setProcessingAuth] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        console.log('Auth redirect page loaded. Processing authentication...');
        console.log('Current URL:', window.location.href);
        
        // First try to extract the session from URL hash parameters (OAuth flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          console.log('Found access token in URL, setting session...');
          // If we have a hash with access token, we need to set the session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });
          
          if (error) {
            console.error('Error setting session from URL:', error);
            throw error;
          }
          
          if (data?.session) {
            console.log('Successfully set session from URL parameters', {
              user: data.session.user.id,
              email: data.session.user.email
            });
            
            // Clean up the URL
            window.history.replaceState(null, document.title, window.location.pathname);
            
            toast({
              title: 'Successfully signed in',
              description: `Welcome${data.session.user.user_metadata.name ? ', ' + data.session.user.user_metadata.name : ''}!`,
            });
            
            navigate('/settings');
            return;
          }
        } else {
          // Fallback to checking for an existing session if no hash params
          console.log('No access token in URL, checking for existing session...');
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session error:', error);
            throw error;
          }
          
          if (data?.session) {
            console.log('Existing session found, user authenticated:', data.session.user.email);
            
            // Clean up the URL
            window.history.replaceState(null, document.title, window.location.pathname);
            
            toast({
              title: 'Successfully signed in',
              description: `Welcome${data.session.user.user_metadata.name ? ', ' + data.session.user.user_metadata.name : ''}!`,
            });
            
            navigate('/settings');
            return;
          }
        }

        console.log('No session found, redirecting to auth page');
        setProcessingAuth(false);
        navigate('/auth');
      } catch (error: any) {
        console.error('Auth redirect error:', error);
        setErrorMessage(error.message || 'An unexpected error occurred');
        setProcessingAuth(false);
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
        {processingAuth ? (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-lg text-white">Completing authentication...</p>
          </>
        ) : (
          <>
            {errorMessage ? (
              <div className="text-red-400">
                <p className="text-xl font-semibold">Authentication Error</p>
                <p className="mt-2">{errorMessage}</p>
                <button 
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                  onClick={() => navigate('/auth')}
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <div className="text-white">
                <p className="text-xl">Redirecting...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuthRedirect;
