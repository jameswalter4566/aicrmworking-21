
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import PredictiveDialerDashboard from '@/components/predictive-dialer/PredictiveDialerDashboard';

const PredictiveDialer: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Authentication Required</h2>
          <p className="text-gray-500">Please log in to access the Predictive Dialer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PredictiveDialerDashboard />
    </div>
  );
};

export default PredictiveDialer;
