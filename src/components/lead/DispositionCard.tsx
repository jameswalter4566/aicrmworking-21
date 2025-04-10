
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DispositionSelector from '@/components/DispositionSelector';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import { LeadProfile } from '@/services/leadProfile';

interface DispositionCardProps {
  lead: LeadProfile;
  editMode: boolean;
  editedLead: LeadProfile;
  isSaving: boolean;
  activeIndustry: string;
  handleDispositionChange: (disposition: string) => void;
  handleEditChange: (field: keyof LeadProfile, value: string) => void;
  handlePushToMortgagePipeline: () => void;
}

const DispositionCard: React.FC<DispositionCardProps> = ({
  lead,
  editMode,
  editedLead,
  isSaving,
  activeIndustry,
  handleDispositionChange,
  handleEditChange,
  handlePushToMortgagePipeline
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disposition Status</CardTitle>
        <CardDescription>Current status of this lead in your pipeline</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-between items-center">
        {editMode ? (
          <div>
            <label className="text-sm text-gray-500 mb-2 block">Select Disposition</label>
            <DispositionSelector 
              currentDisposition={editedLead.disposition || ''} 
              onDispositionChange={(value) => handleEditChange('disposition', value)}
              disabled={isSaving}
            />
          </div>
        ) : (
          <DispositionSelector 
            currentDisposition={lead.disposition || 'Not Contacted'} 
            onDispositionChange={handleDispositionChange}
            disabled={isSaving}
          />
        )}
        {!lead.isMortgageLead && activeIndustry === 'mortgage' && (
          <Button 
            variant="outline" 
            onClick={handlePushToMortgagePipeline}
            disabled={isSaving}
          >
            <Rocket className="mr-2 h-4 w-4" />
            Push to Pipeline
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DispositionCard;
