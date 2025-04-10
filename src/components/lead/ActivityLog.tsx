
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MessageSquare, Calendar, Edit, Activity, FileText, Rocket } from 'lucide-react';
import { format } from 'date-fns';
import { LeadActivity } from '@/services/leadProfile';

interface ActivityLogProps {
  activities: LeadActivity[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ activities }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>Track all interactions with this lead</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="flex">
                <div className="mr-4 relative">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    {activity.type === "Email" && <Mail className="h-5 w-5 text-blue-600" />}
                    {activity.type === "Call" && <Phone className="h-5 w-5 text-blue-600" />}
                    {activity.type === "Text" && <MessageSquare className="h-5 w-5 text-blue-600" />}
                    {activity.type === "Meeting" && <Calendar className="h-5 w-5 text-blue-600" />}
                    {activity.type === "Edit" && <Edit className="h-5 w-5 text-blue-600" />}
                    {activity.type === "Disposition Change" && <Activity className="h-5 w-5 text-blue-600" />}
                    {activity.type === "Mortgage Information Update" && <FileText className="h-5 w-5 text-blue-600" />}
                    {activity.type === "Pipeline" && <Rocket className="h-5 w-5 text-blue-600" />}
                  </div>
                  {index < activities.length - 1 && (
                    <div className="absolute top-10 left-5 w-0.5 h-full bg-gray-200" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{activity.type}</h4>
                  <p className="text-gray-600">{activity.description}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(activity.timestamp), 'MMM dd, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="mx-auto h-12 w-12 opacity-30 mb-2" />
            <p>No activity has been recorded yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLog;
