
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
  blueStyle?: boolean;
}

const PropertyInfoStep = ({ leadData, onSave, blueStyle }: PropertyInfoStepProps) => {
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

  // Custom styles for blue focus from screenshot/user ask
  const headerClass = blueStyle
    ? "text-2xl md:text-3xl font-bold text-center mb-8 text-[#1769aa]"
    : "text-2xl font-bold text-gray-900";
  const labelClass = blueStyle
    ? "mb-1 font-medium text-[#1769aa]"
    : "";
  const inputClass = blueStyle
    ? "bg-[#e7f0fa] font-semibold focus:border-[#1769aa] focus:ring-[#1769aa] text-black border-[#b7d1ea] placeholder-gray-500"
    : "";

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <h2 className={headerClass}>What home are you refinancing?</h2>
      <div className="space-y-2">
        <Label htmlFor="propertyAddress" className={labelClass}>Address</Label>
        <Input id="propertyAddress" {...register('propertyAddress')} className={inputClass} />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[150px] space-y-2">
          <Label htmlFor="propertyValue" className={labelClass}>Estimated Value</Label>
          <Input 
            id="propertyValue" 
            type="number" 
            {...register('mortgageData.property.propertyValue')} 
            className={inputClass}
            placeholder="$"
          />
        </div>
        <div className="flex-1 min-w-[150px] space-y-2">
          <Label htmlFor="propertyType" className={labelClass}>Type</Label>
          <Input id="propertyType" {...register('mortgageData.property.propertyType')} className={inputClass} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[150px] space-y-2">
          <Label htmlFor="occupancy" className={labelClass}>Occupancy</Label>
          <Input id="occupancy" {...register('mortgageData.property.occupancy')} className={inputClass} />
        </div>
        <div className="flex-1 min-w-[150px] space-y-2">
          <Label htmlFor="zip" className={labelClass}>ZIP code</Label>
          <Input id="zip" placeholder="92869" className={inputClass} />
        </div>
      </div>
      <Button type="submit" className="w-full bg-[#1769aa] text-white hover:bg-[#145089] text-lg rounded-xl py-6 mt-2">
        Next
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
};

export default PropertyInfoStep;
