
import React from 'react';
import { Button } from '@/components/ui/button';
import { LeadProfile } from '@/services/leadProfile';
import { CheckCircle } from 'lucide-react';

interface WelcomeStepProps {
  leadData: LeadProfile;
  updateLeadData: (data: Partial<LeadProfile>) => Promise<boolean>;
  onNext: () => void;
}

const WelcomeStep = ({ leadData, onNext }: WelcomeStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Welcome to Your Mortgage Portal!</h2>
        <p className="text-gray-600">
          Please confirm the information we have on file is correct before proceeding.
        </p>
      </div>

      <div className="space-y-4 mt-6">
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-medium mb-4">Your Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">First Name</p>
              <p className="font-medium">{leadData.firstName || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Name</p>
              <p className="font-medium">{leadData.lastName || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email Address</p>
              <p className="font-medium">{leadData.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone Number</p>
              <p className="font-medium">{leadData.phone1 || 'Not provided'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span className="text-green-600">All information provided is kept secure and confidential</span>
        </div>

        <div className="flex flex-col items-center justify-center mt-4">
          <p className="text-sm text-gray-500 mb-4 text-center">
            To help us better assist you with your mortgage needs, we'll need to collect a few more details.
          </p>
          <Button 
            onClick={onNext}
            className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
          >
            Yes, this information is correct
          </Button>

          <p className="mt-3 text-sm text-gray-500">
            If this information is not correct, please contact your loan officer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeStep;
