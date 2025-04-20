
import React from 'react';
import { useForm } from 'react-hook-form';
import { LeadProfile } from '@/services/leadProfile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface PropertyInfoStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

const PropertyInfoStep = ({ leadData, onSave }: PropertyInfoStepProps) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      propertyAddress: leadData.propertyAddress || '',
      mortgageData: {
        property: {
          propertyValue: leadData.mortgageData?.property?.propertyValue || '',
          propertyType: leadData.mortgageData?.property?.propertyType || '',
          occupancy: leadData.mortgageData?.property?.occupancy || ''
        }
      }
    }
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Property Information</h2>
      
      <div className="space-y-2">
        <Label htmlFor="propertyAddress">Property Address</Label>
        <Input id="propertyAddress" {...register('propertyAddress')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="propertyValue">Estimated Property Value</Label>
        <Input 
          id="propertyValue" 
          type="number" 
          {...register('mortgageData.property.propertyValue')} 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="propertyType">Property Type</Label>
        <Input id="propertyType" {...register('mortgageData.property.propertyType')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="occupancy">Occupancy</Label>
        <Input id="occupancy" {...register('mortgageData.property.occupancy')} />
      </div>

      <Button type="submit" className="w-full">
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
};

export default PropertyInfoStep;
