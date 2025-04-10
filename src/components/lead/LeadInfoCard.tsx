
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { LeadProfile } from '@/services/leadProfile';

interface LeadInfoCardProps {
  lead: LeadProfile;
}

const LeadInfoCard: React.FC<LeadInfoCardProps> = ({ lead }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-500">Created</p>
          <p className="flex items-center mt-1">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            {lead.createdAt ? (
              format(new Date(lead.createdAt), 'MMM dd, yyyy')
            ) : (
              'Unknown'
            )}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Last Updated</p>
          <p className="flex items-center mt-1">
            <Clock className="h-4 w-4 mr-2 text-gray-500" />
            {lead.updatedAt ? (
              format(new Date(lead.updatedAt), 'MMM dd, yyyy')
            ) : (
              'Unknown'
            )}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Created By</p>
          <p className="flex items-center mt-1">
            <UserCircle className="h-4 w-4 mr-2 text-gray-500" />
            {lead.createdBy || 'Unknown'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadInfoCard;
