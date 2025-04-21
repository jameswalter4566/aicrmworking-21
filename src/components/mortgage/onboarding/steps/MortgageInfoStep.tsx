import React from 'react';
import { useForm } from 'react-hook-form';
import { LeadProfile } from '@/services/leadProfile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

interface MortgageInfoStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

const loanTypeOptions = [
  { value: 'Conventional', label: 'Conventional' },
  { value: 'FHA', label: 'FHA' },
  { value: 'VA', label: 'VA' },
  { value: 'REVERSE', label: 'REVERSE' }
];

const propertyTypeOptions = [
  { value: 'Primary residence', label: 'Primary residence' },
  { value: 'Investment property', label: 'Investment property' },
  { value: 'Secondary home', label: 'Secondary home' },
  { value: 'Vacation home', label: 'Vacation home' }
];

const MortgageInfoStep = ({ leadData, onSave }: MortgageInfoStepProps) => {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      mortgageData: {
        property: {
          propertyType: leadData.mortgageData?.property?.propertyType || '',
        },
        loan: {
          loanAmount: leadData.mortgageData?.loan?.loanAmount || '',
          loanType: leadData.mortgageData?.loan?.loanType || '',
          mortgageTerm: leadData.mortgageData?.loan?.mortgageTerm || '',
          purpose: leadData.mortgageData?.loan?.purpose || ''
        }
      }
    }
  });

  const watchedPropertyType = watch('mortgageData.property.propertyType');
  const watchedLoanType = watch('mortgageData.loan.loanType');

  const onLocalSave = (formValues: any) => {
    onSave({
      mortgageData: {
        ...leadData.mortgageData,
        property: {
          ...leadData.mortgageData?.property,
          propertyType: formValues.mortgageData?.property?.propertyType || '',
        },
        loan: {
          ...formValues.mortgageData?.loan
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onLocalSave)} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Mortgage Information</h2>
      
      <div className="space-y-2">
        <Label htmlFor="propertyType">What type of property is this?</Label>
        <Select
          value={watchedPropertyType}
          onValueChange={val => setValue('mortgageData.property.propertyType', val, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select property type" />
          </SelectTrigger>
          <SelectContent>
            {propertyTypeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="loanAmount">Current Loan Balance</Label>
        <Input 
          id="loanAmount" 
          type="number" 
          {...register('mortgageData.loan.loanAmount')} 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="loanType">Loan Type</Label>
        <Select
          value={watchedLoanType}
          onValueChange={val => setValue('mortgageData.loan.loanType', val, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select loan type" />
          </SelectTrigger>
          <SelectContent>
            {loanTypeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mortgageTerm">Desired Mortgage Term (years)</Label>
        <Input 
          id="mortgageTerm" 
          type="number" 
          {...register('mortgageData.loan.mortgageTerm')} 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="purpose">Loan Purpose</Label>
        <Input id="purpose" {...register('mortgageData.loan.purpose')} />
      </div>

      <Button type="submit" className="w-full">
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
};

export default MortgageInfoStep;
