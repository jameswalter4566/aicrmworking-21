
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
