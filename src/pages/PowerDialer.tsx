
import React from "react";
import MainLayout from "@/components/layouts/MainLayout";
import PowerDialerDashboard from "@/components/power-dialer/PowerDialerDashboard";
import TwilioScript from "@/components/TwilioScript";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PowerDialer = () => {
  const { user } = useAuth();

  return (
    <MainLayout>
      <TwilioScript />
      {user ? (
        <PowerDialerDashboard />
      ) : (
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Login Required</h2>
          <p className="mb-4">You need to be logged in to use the Power Dialer.</p>
          <Button asChild>
            <Link to="/auth">Login or Sign Up</Link>
          </Button>
        </div>
      )}
    </MainLayout>
  );
};

export default PowerDialer;
