
import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, getAuthToken } = useAuth();
  const location = useLocation();

  // Check authentication status on route changes
  useEffect(() => {
    async function verifyAuth() {
      const token = await getAuthToken();
      if (!token) {
        console.log("Authentication verification failed: No valid token found");
      }
    }
    
    verifyAuth();
  }, [location.pathname, getAuthToken]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    // Store the path user was trying to access for later redirect after login
    sessionStorage.setItem("redirectAfterLogin", location.pathname);
    console.log("Access denied - redirecting to login page");
    return <Navigate to="/landing" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
