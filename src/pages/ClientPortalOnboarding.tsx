
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import OnboardingSequence from '@/components/mortgage/onboarding/OnboardingSequence';

const ClientPortalOnboarding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const portalId = searchParams.get('portalId');
  const leadId = searchParams.get('leadId');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {slug && token && leadId ? (
        <div className="container mx-auto">
          <OnboardingSequence 
            leadId={leadId} 
            accessToken={token}
            portalId={portalId || undefined}
          />
        </div>
      ) : (
        <div className="container mx-auto text-center">
          <h2 className="text-2xl font-bold text-red-600">Invalid Access</h2>
          <p className="mt-4">This page requires proper authentication parameters.</p>
        </div>
      )}
    </div>
  );
};

export default ClientPortalOnboarding;
