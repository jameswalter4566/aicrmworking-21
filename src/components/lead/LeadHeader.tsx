
import React from 'react';
import { ArrowLeft, Edit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LeadProfile } from '@/services/leadProfile';

interface LeadHeaderProps {
  lead: LeadProfile;
  editMode: boolean;
  isSaving: boolean;
  toggleEditMode: () => void;
}

const LeadHeader: React.FC<LeadHeaderProps> = ({ 
  lead, 
  editMode, 
  isSaving, 
  toggleEditMode 
}) => {
  return (
    <>
      <div className="mb-4">
        <Link to="/people" className="text-blue-600 hover:text-blue-800 flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Leads
        </Link>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="text-gray-500">Lead ID: {lead.id}</p>
        </div>
        <Button 
          variant={editMode ? "destructive" : "outline"}
          onClick={toggleEditMode}
          disabled={isSaving}
        >
          {editMode ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Edit className="mr-2 h-4 w-4" />
              Edit Lead
            </>
          )}
        </Button>
      </div>
    </>
  );
};

export default LeadHeader;
