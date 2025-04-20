
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LeadProfile } from '@/services/leadProfile';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FinancialInfoStepProps {
  leadData: LeadProfile;
  updateLeadData: (data: Partial<LeadProfile>) => Promise<boolean>;
  onNext: () => void;
  onPrevious: () => void;
}

const formSchema = z.object({
  employmentStatus: z.string().min(1, 'Employment status is required'),
  employerName: z.string().optional(),
  jobTitle: z.string().optional(),
  monthlyIncome: z.string().min(1, 'Monthly income is required'),
  creditScoreRange: z.string().min(1, 'Credit score range is required'),
  monthlyDebts: z.string().optional(),
});

const FinancialInfoStep = ({ leadData, updateLeadData, onNext, onPrevious }: FinancialInfoStepProps) => {
  const [isSaving, setIsSaving] = useState(false);
  
  const mortgageData = leadData.mortgageData || {};
  const employmentData = mortgageData.employment || {};
  const incomeData = mortgageData.income || {};
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employmentStatus: employmentData.employmentStatus || '',
      employerName: employmentData.employerName || '',
      jobTitle: employmentData.jobTitle || '',
      monthlyIncome: incomeData.baseIncome || '',
      creditScoreRange: mortgageData.creditScore || '',
      monthlyDebts: mortgageData.liabilities?.monthlyPayments || '',
    },
  });

  // Watch employment status to conditionally show fields
  const watchEmploymentStatus = form.watch('employmentStatus');
  const showEmployerFields = watchEmploymentStatus === 'Employed' || watchEmploymentStatus === 'Self-Employed';

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSaving(true);
      
      // Update mortgage data
      const currentMortgageData = leadData.mortgageData || {};
      
      const updatedMortgageData = {
        ...currentMortgageData,
        creditScore: values.creditScoreRange,
        employment: {
          ...(currentMortgageData.employment || {}),
          employmentStatus: values.employmentStatus,
          employerName: values.employerName,
          jobTitle: values.jobTitle,
          isSelfEmployed: values.employmentStatus === 'Self-Employed',
        },
        income: {
          ...(currentMortgageData.income || {}),
          baseIncome: values.monthlyIncome,
        },
        liabilities: {
          ...(currentMortgageData.liabilities || {}),
          monthlyPayments: values.monthlyDebts,
        }
      };
      
      const success = await updateLeadData({
        mortgageData: updatedMortgageData
      });
      
      if (success) {
        onNext();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-6">
        <h2 className="text-xl font-semibold">Financial Information</h2>
        <p className="text-gray-600">
          Please provide some basic financial details to help us with your application.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="employmentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Employed">Employed</SelectItem>
                    <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                    <SelectItem value="Unemployed">Unemployed</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {showEmployerFields && (
            <>
              <FormField
                control={form.control}
                name="employerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{watchEmploymentStatus === 'Self-Employed' ? 'Business Name' : 'Employer Name'}</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="monthlyIncome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gross Monthly Income ($)</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="5,000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="creditScoreRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credit Score Range</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select credit score range" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="740+">Excellent (740+)</SelectItem>
                    <SelectItem value="700-739">Good (700-739)</SelectItem>
                    <SelectItem value="660-699">Fair (660-699)</SelectItem>
                    <SelectItem value="620-659">Poor (620-659)</SelectItem>
                    <SelectItem value="580-619">Very Poor (580-619)</SelectItem>
                    <SelectItem value="Below 580">Below 580</SelectItem>
                    <SelectItem value="Not Sure">Not Sure</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthlyDebts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Approximate Monthly Debt Payments ($)</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="1,200" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onPrevious}
              disabled={isSaving}
            >
              Back
            </Button>
            <Button 
              type="submit" 
              className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default FinancialInfoStep;
