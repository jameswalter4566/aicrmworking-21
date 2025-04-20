
import React from 'react';
import { useForm } from 'react-hook-form';
import { LeadProfile } from '@/services/leadProfile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface MortgageInfoStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

const MortgageInfoStep = ({ leadData, onSave }: MortgageInfoStepProps) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      mortgageData: {
        loan: {
          loanAmount: leadData.mortgageData?.loan?.loanAmount || '',
          loanType: leadData.mortgageData?.loan?.loanType || '',
          mortgageTerm: leadData.mortgageData?.loan?.mortgageTerm || '',
          purpose: leadData.mortgageData?.loan?.loanPurpose || ''
        }
      }
    }
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Mortgage Information</h2>
      
      <div className="space-y-2">
        <Label htmlFor="loanAmount">Desired Loan Amount</Label>
        <Input 
          id="loanAmount" 
          type="number" 
          {...register('mortgageData.loan.loanAmount')} 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="loanType">Loan Type</Label>
        <Input id="loanType" {...register('mortgageData.loan.loanType')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mortgageTerm">Mortgage Term (years)</Label>
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
