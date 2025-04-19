
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';

interface ClientPortalPrePipelineProps {
  section: string;
  onActionClick?: () => void;
}

const SECTION_MESSAGES = {
  conditions: {
    title: "Loan Conditions",
    message: "This section will display your loan conditions once your application is submitted. Start your application now to view your required documents!",
  },
  progress: {
    title: "Loan Progress",
    message: "Your loan progress will be tracked here once your application is submitted. Begin your journey to homeownership today!",
  },
  documents: {
    title: "Document Upload",
    message: "This is where you'll manage and upload your required documents once your loan is submitted. Get started with your application now!",
  },
  communication: {
    title: "Loan Team Communication",
    message: "Direct communication with your loan team will be available here after your application is submitted. Start your application to connect with our team!",
  }
};

const ClientPortalPrePipeline: React.FC<ClientPortalPrePipelineProps> = ({
  section,
  onActionClick
}) => {
  const content = SECTION_MESSAGES[section as keyof typeof SECTION_MESSAGES] || {
    title: "Section Unavailable",
    message: "This section will be available once your loan application is submitted."
  };

  return (
    <Card className="border-dashed border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg text-blue-800">{content.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <FileText className="h-16 w-16 text-blue-300" />
          </div>
          <p className="text-center text-gray-600">{content.message}</p>
          <Button 
            onClick={onActionClick}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
          >
            Start Application <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientPortalPrePipeline;
