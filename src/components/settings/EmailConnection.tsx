
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

const SUPABASE_URL = "https://imrmboyczebjlbnkgjns.supabase.co";

export const EmailConnection = () => {
  const [loading, setLoading] = useState(false);
  const { getAuthToken } = useAuth();
  
  const connectGoogleEmail = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('You must be logged in to connect your email account');
      }
      
      const functionUrl = `${SUPABASE_URL}/functions/v1/connect-google-email?action=authorize`;
      console.log("Calling Supabase function:", functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", response.status, errorText.substring(0, 200));
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.url) {
        console.log("Redirecting to:", data.url.substring(0, 100) + "...");
        window.location.href = data.url;
      } else {
        throw new Error("Failed to generate authorization URL");
      }
    } catch (error) {
      console.error("Error initiating Google OAuth flow:", error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to start the Google connection process. Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={connectGoogleEmail}
      disabled={loading}
      className="w-full flex items-center space-x-2"
    >
      {loading ? (
        <span>Connecting...</span>
      ) : (
        <>
          <Mail className="h-5 w-5" />
          <span>Connect Gmail</span>
        </>
      )}
    </Button>
  );
};
