
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClientPortalConditions from './ClientPortalConditions';
import ClientPortalLoanProgress from './ClientPortalLoanProgress';
import ClientPortalPrePipeline from './ClientPortalPrePipeline';

interface ClientPortalContentProps {
  leadId: string | number;
  isInPipeline: boolean;
  onStartApplication?: () => void;
}

const ClientPortalContent: React.FC<ClientPortalContentProps> = ({
  leadId,
  isInPipeline,
  onStartApplication
}) => {
  return (
    <Tabs defaultValue="progress" className="w-full">
      <TabsList className="w-full border-b">
        <TabsTrigger value="progress">Loan Progress</TabsTrigger>
        <TabsTrigger value="conditions">Conditions</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="communication">Communication</TabsTrigger>
      </TabsList>

      <TabsContent value="progress" className="mt-4">
        {isInPipeline ? (
          <ClientPortalLoanProgress leadId={leadId} displayStyle="full" />
        ) : (
          <ClientPortalPrePipeline 
            section="progress"
            onActionClick={onStartApplication}
          />
        )}
      </TabsContent>

      <TabsContent value="conditions" className="mt-4">
        {isInPipeline ? (
          <ClientPortalConditions leadId={leadId} />
        ) : (
          <ClientPortalPrePipeline 
            section="conditions"
            onActionClick={onStartApplication}
          />
        )}
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        {isInPipeline ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Document Upload</h3>
            {/* Document upload component will go here */}
          </div>
        ) : (
          <ClientPortalPrePipeline 
            section="documents"
            onActionClick={onStartApplication}
          />
        )}
      </TabsContent>

      <TabsContent value="communication" className="mt-4">
        {isInPipeline ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Communication Center</h3>
            {/* Communication component will go here */}
          </div>
        ) : (
          <ClientPortalPrePipeline 
            section="communication"
            onActionClick={onStartApplication}
          />
        )}
      </TabsContent>
    </Tabs>
  );
};

export default ClientPortalContent;
