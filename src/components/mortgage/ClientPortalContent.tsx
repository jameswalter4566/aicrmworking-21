
import React from 'react';
import { Card } from '@/components/ui/card';
import { ClientPortalConditions } from './ClientPortalConditions';
import ClientPortalLoanProgress from './ClientPortalLoanProgress';
import { Upload, FileText, ClipboardCheck, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClientPortalContentProps {
  leadId: string | number;
  isInPipeline?: boolean;
}

const PrePipelineMessage = ({ title, description }: { title: string; description: string }) => (
  <Card className="p-6">
    <div className="text-center space-y-4">
      <h3 className="text-xl font-semibold text-blue-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
      <Button className="bg-blue-600 hover:bg-blue-700">
        <Upload className="mr-2 h-4 w-4" />
        Start Your Application
      </Button>
    </div>
  </Card>
);

export const ClientPortalContent = ({ leadId, isInPipeline = false }: ClientPortalContentProps) => {
  const refreshData = () => {
    console.log("Refreshing data...");
  };

  if (!isInPipeline) {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-blue-900">Welcome to Your Mortgage Portal</h2>
            <p className="text-gray-600">
              Start your journey towards homeownership by uploading your documents and completing your application.
              Once submitted, you'll have access to track your loan progress and manage conditions.
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PrePipelineMessage 
            title="Loan Progress"
            description="After submitting your application, you'll be able to track your loan progress here."
          />
          
          <PrePipelineMessage
            title="Loan Conditions"
            description="Once your application is in process, you'll see your required conditions here."
          />
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-blue-900">Get Started</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Upload className="mr-2 h-4 w-4" />
                Upload Documents
              </Button>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Calculator className="mr-2 h-4 w-4" />
                Payment Calculator
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientPortalLoanProgress 
        leadId={leadId} 
        className="mb-6" 
      />
      <ClientPortalConditions 
        leadId={leadId}
        refreshData={refreshData}
      />
    </div>
  );
};
