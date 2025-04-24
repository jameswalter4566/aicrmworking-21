
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  userRole: string | null;
  refreshUserRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchUserRole = async (userId: string | undefined) => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        return;
      }

      if (data && typeof data === 'object' && 'role' in data) {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Error in fetchUserRole:", error);
    }
  };

  const refreshUserRole = async () => {
    if (user?.id) {
      await fetchUserRole(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        
        // Update session and user states
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Verify session is still valid
          const { data: { session: verifiedSession } } = await supabase.auth.getSession();
          if (!verifiedSession) {
            console.warn("Session verification failed - forcing logout");
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setUserRole(null);
          } else {
            fetchUserRole(currentSession.user.id);
          }
        } else {
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Retrieved session:", currentSession ? "Session exists" : "No session");
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchUserRole(currentSession.user.id);
      }
      
      setLoading(false);
    });

    // Check auth session validity periodically
    const authCheckInterval = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (user && !data.session) {
        console.warn("Session expired - forcing update of auth state");
        setSession(null);
        setUser(null);
        setUserRole(null);
      }
    }, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(authCheckInterval);
    };
  }, []);

  const signOut = async () => {
    console.log("Signing out user");
    await supabase.auth.signOut();
    setUserRole(null);
    
    // Redirect is handled by the onAuthStateChange listener
  };

  // Helper function to get the authentication token
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || null;
      
      if (!token && user) {
        console.warn("Token missing but user exists - possible auth state mismatch");
        // Force reauthentication
        setUser(null);
        setSession(null);
        return null;
      }
      
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      loading, 
      signOut, 
      getAuthToken, 
      userRole,
      refreshUserRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
