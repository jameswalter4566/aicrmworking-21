
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin, Tag, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadProfile } from '@/services/leadProfile';

interface ContactInfoCardProps {
  lead: LeadProfile;
  editMode: boolean;
  editedLead: LeadProfile;
  isSaving: boolean;
  getIndustryOutlineColor: () => string;
  handleEditChange: (field: keyof LeadProfile, value: string) => void;
  handleSaveChanges: () => void;
}

const ContactInfoCard: React.FC<ContactInfoCardProps> = ({
  lead,
  editMode,
  editedLead,
  isSaving,
  getIndustryOutlineColor,
  handleEditChange,
  handleSaveChanges
}) => {
  return (
    <Card className={`col-span-2 ${getIndustryOutlineColor()} border-2`}>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
        <CardDescription>Basic details and contact information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center">
          <Avatar className="h-16 w-16 mr-4">
            {lead.avatar ? (
              <AvatarImage src={lead.avatar} alt={`${lead.firstName} ${lead.lastName}`} />
            ) : (
              <AvatarFallback className="bg-blue-50 text-blue-700 text-xl">
                {lead.firstName?.charAt(0) || '?'}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            {editMode ? (
              <div className="flex space-x-2">
                <div>
                  <label className="text-sm text-gray-500">First Name</label>
                  <Input 
                    value={editedLead.firstName || ''}
                    onChange={(e) => handleEditChange('firstName', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500">Last Name</label>
                  <Input 
                    value={editedLead.lastName || ''}
                    onChange={(e) => handleEditChange('lastName', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              <h3 className="text-xl font-medium">
                {lead.firstName} {lead.lastName}
              </h3>
            )}
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-medium mb-3">Contact Details</h4>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Primary Phone</p>
                {editMode ? (
                  <Input 
                    value={editedLead.phone1 || ''}
                    onChange={(e) => handleEditChange('phone1', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{lead.phone1 || 'Not provided'}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Secondary Phone</p>
                {editMode ? (
                  <Input 
                    value={editedLead.phone2 || ''}
                    onChange={(e) => handleEditChange('phone2', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{lead.phone2 || 'Not provided'}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email Address</p>
                {editMode ? (
                  <Input 
                    value={editedLead.email || ''}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                  />
                ) : (
                  <p className="font-medium">{lead.email || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h4 className="font-medium mb-3">Addresses</h4>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Mailing Address</p>
                {editMode ? (
                  <Textarea 
                    value={editedLead.mailingAddress || ''}
                    onChange={(e) => handleEditChange('mailingAddress', e.target.value)}
                    rows={2}
                  />
                ) : (
                  <p className="font-medium">{lead.mailingAddress || 'Not provided'}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Property Address</p>
                {editMode ? (
                  <Textarea 
                    value={editedLead.propertyAddress || ''}
                    onChange={(e) => handleEditChange('propertyAddress', e.target.value)}
                    rows={2}
                  />
                ) : (
                  <p className="font-medium">
                    {lead.propertyAddress || 'Not provided'}
                    {lead.propertyAddress === lead.mailingAddress && lead.mailingAddress && (
                      <span className="text-sm text-gray-500 ml-2">(Same as mailing)</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {lead.tags && lead.tags.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="bg-blue-50">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
      {editMode && (
        <CardFooter>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ContactInfoCard;
