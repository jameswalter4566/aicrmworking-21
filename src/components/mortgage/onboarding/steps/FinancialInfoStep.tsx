import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';

interface FinancialInfoStepProps {
  leadData: any;
  onSave: (data: any) => void;
}

const FinancialInfoStep: React.FC<FinancialInfoStepProps> = ({ leadData, onSave }) => {
  const handleFinish = () => {
    // Pass the final data to the parent
    onSave({
      // ... any financial info data
      isCompleted: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-blue-800 mb-2">
          Financial Information
        </h2>
        <p className="text-gray-600">
          Last step! Please provide your financial details to complete your application.
        </p>
      </div>

      {/* ... Financial info form fields would go here ... */}

      <div className="flex justify-end space-x-4 mt-8">
        <Button 
          onClick={handleFinish}
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white px-8"
        >
          <Check className="mr-2 h-5 w-5" />
          Finish Application
        </Button>
      </div>
    </div>
  );
};

export default FinancialInfoStep;
