
import React from 'react';
import { useForm } from 'react-hook-form';
import { LeadProfile } from '@/services/leadProfile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface ContactInfoStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

const ContactInfoStep = ({ leadData, onSave }: ContactInfoStepProps) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: leadData.firstName || '',
      lastName: leadData.lastName || '',
      email: leadData.email || '',
      phone1: leadData.phone1 || '',
      mailingAddress: leadData.mailingAddress || ''
    }
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" {...register('firstName')} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" {...register('lastName')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone1">Phone Number</Label>
        <Input id="phone1" type="tel" {...register('phone1')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mailingAddress">Mailing Address</Label>
        <Input id="mailingAddress" {...register('mailingAddress')} />
      </div>

      <Button type="submit" className="w-full">
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
};

export default ContactInfoStep;
