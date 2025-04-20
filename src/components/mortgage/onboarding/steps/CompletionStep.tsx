
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

interface CompletionStepProps {
  onComplete: () => void;
}

const CompletionStep = ({ onComplete }: CompletionStepProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-semibold text-mortgage-darkPurple">Application Complete!</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Thank you for completing your mortgage application information. 
          Your loan officer will review your details and contact you shortly.
        </p>
      </div>
      
      <div className="bg-green-50 border border-green-100 rounded-lg p-4 my-6">
        <h3 className="font-medium text-green-800 mb-2">What happens next?</h3>
        <ul className="space-y-2 text-green-700 text-sm">
          <li className="flex items-start">
            <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>Your loan officer will review your application</span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>You'll receive an email with next steps</span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>You can now access your mortgage portal to track your loan progress</span>
          </li>
        </ul>
      </div>
      
      <div className="text-center pt-4">
        <Button 
          onClick={handleSubmit} 
          className="bg-mortgage-purple hover:bg-mortgage-darkPurple px-8"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            'Access Your Portal'
          )}
        </Button>
      </div>
    </div>
  );
};

export default CompletionStep;
