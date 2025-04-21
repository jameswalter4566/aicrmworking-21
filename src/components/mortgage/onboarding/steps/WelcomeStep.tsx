
import React from 'react';
import { LeadProfile } from '@/services/leadProfile';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
  leadData: Partial<LeadProfile>;
  onNext: (data: Partial<LeadProfile>) => void;
  headingClass?: string;
  subtitleClass?: string;
}

const WelcomeStep = ({ leadData, onNext, headingClass, subtitleClass }: WelcomeStepProps) => {
  return (
    <div className="space-y-6 text-center">
      <h1 className={`text-3xl font-bold ${headingClass || "text-gray-900"}`}>
        Welcome {leadData.firstName}!
      </h1>
      <p className={`text-lg max-w-xl mx-auto ${subtitleClass || "text-gray-600"}`}>
        Let's get started with your mortgage application. We'll guide you through a few quick steps to gather the information we need.
      </p>
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Please confirm your information:</h2>
        <ul className="space-y-2 text-left">
          <li><span className="font-medium">Name:</span> {leadData.firstName} {leadData.lastName}</li>
          <li><span className="font-medium">Email:</span> {leadData.email}</li>
          <li><span className="font-medium">Phone:</span> {leadData.phone1}</li>
        </ul>
      </div>
      <Button 
        onClick={() => onNext(leadData)}
        className="w-full max-w-sm bg-[#1769aa] text-white hover:bg-[#145089] rounded-xl py-6"
      >
        Begin Application
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

export default WelcomeStep;
