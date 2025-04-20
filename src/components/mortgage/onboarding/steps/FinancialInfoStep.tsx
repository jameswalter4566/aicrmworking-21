
import React from 'react';
import { useForm } from 'react-hook-form';
import { LeadProfile } from '@/services/leadProfile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface FinancialInfoStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

const FinancialInfoStep = ({ leadData, onSave }: FinancialInfoStepProps) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      mortgageData: {
        income: {
          baseIncome: leadData.mortgageData?.income?.baseIncome || '',
          otherIncome: leadData.mortgageData?.income?.otherIncome || ''
        },
        assets: {
          bankAccounts: leadData.mortgageData?.assets?.bankAccounts || '',
          investments: leadData.mortgageData?.assets?.investments || ''
        }
      }
    }
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Financial Information</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="baseIncome">Monthly Base Income</Label>
          <Input 
            id="baseIncome" 
            type="number" 
            {...register('mortgageData.income.baseIncome')} 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="otherIncome">Other Monthly Income</Label>
          <Input 
            id="otherIncome" 
            type="number" 
            {...register('mortgageData.income.otherIncome')} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bankAccounts">Bank Account Balance</Label>
          <Input 
            id="bankAccounts" 
            type="number" 
            {...register('mortgageData.assets.bankAccounts')} 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="investments">Investment Balance</Label>
          <Input 
            id="investments" 
            type="number" 
            {...register('mortgageData.assets.investments')} 
          />
        </div>
      </div>

      <Button type="submit" className="w-full">
        Complete
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
};

export default FinancialInfoStep;
