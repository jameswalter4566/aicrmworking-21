
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface MortgageInfoStepProps {
  leadData: LeadProfile;
  updateLeadData: (data: Partial<LeadProfile>) => Promise<boolean>;
  onNext: () => void;
  onPrevious: () => void;
}

const formSchema = z.object({
  loanPurpose: z.string().min(1, 'Loan purpose is required'),
  loanAmount: z.string().min(1, 'Loan amount is required'),
  loanType: z.string().min(1, 'Loan type is required'),
  mortgageTerm: z.string().min(1, 'Mortgage term is required'),
  hasExistingMortgage: z.enum(['yes', 'no']),
  currentRate: z.string().optional(),
  currentPayment: z.string().optional(),
});

const MortgageInfoStep = ({ leadData, updateLeadData, onNext, onPrevious }: MortgageInfoStepProps) => {
  const [isSaving, setIsSaving] = useState(false);
  
  const mortgageData = leadData.mortgageData || {};
  const propertyData = mortgageData.property || {};
  const loanData = mortgageData.loan || {};
  
  // Determine if lead has existing mortgage based on current data
  const hasExistingMortgage = loanData.currentRate || loanData.currentPayment ? 'yes' : 'no';
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loanPurpose: propertyData.loanPurpose || '',
      loanAmount: propertyData.loanAmount?.toString() || '',
      loanType: loanData.loanType || '',
      mortgageTerm: loanData.mortgageTerm || '',
      hasExistingMortgage: hasExistingMortgage,
      currentRate: loanData.currentRate || '',
      currentPayment: loanData.currentPayment || '',
    },
  });

  // Watch the hasExistingMortgage field to conditionally show fields
  const watchHasExistingMortgage = form.watch('hasExistingMortgage');

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSaving(true);
      
      // Update mortgage data
      const currentMortgageData = leadData.mortgageData || {};
      
      const updatedMortgageData = {
        ...currentMortgageData,
        property: {
          ...(currentMortgageData.property || {}),
          loanPurpose: values.loanPurpose,
          loanAmount: values.loanAmount,
        },
        loan: {
          ...(currentMortgageData.loan || {}),
          loanType: values.loanType,
          mortgageTerm: values.mortgageTerm,
        }
      };
      
      // Add existing mortgage data if applicable
      if (values.hasExistingMortgage === 'yes') {
        updatedMortgageData.loan = {
          ...updatedMortgageData.loan,
          currentRate: values.currentRate,
          currentPayment: values.currentPayment,
        };
      }
      
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
        <h2 className="text-xl font-semibold">Mortgage Details</h2>
        <p className="text-gray-600">
          Please provide details about your mortgage needs.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="loanPurpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loan Purpose</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select loan purpose" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Purchase">Purchase</SelectItem>
                    <SelectItem value="Refinance">Refinance</SelectItem>
                    <SelectItem value="Cash-Out Refinance">Cash-Out Refinance</SelectItem>
                    <SelectItem value="Home Equity">Home Equity</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="loanAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desired Loan Amount ($)</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="250,000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="loanType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loan Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select loan type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Conventional">Conventional</SelectItem>
                    <SelectItem value="FHA">FHA</SelectItem>
                    <SelectItem value="VA">VA</SelectItem>
                    <SelectItem value="USDA">USDA</SelectItem>
                    <SelectItem value="Jumbo">Jumbo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mortgageTerm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mortgage Term</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="30-Year Fixed">30-Year Fixed</SelectItem>
                    <SelectItem value="15-Year Fixed">15-Year Fixed</SelectItem>
                    <SelectItem value="10-Year Fixed">10-Year Fixed</SelectItem>
                    <SelectItem value="5/1 ARM">5/1 ARM</SelectItem>
                    <SelectItem value="7/1 ARM">7/1 ARM</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasExistingMortgage"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Do you have an existing mortgage?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="yes" />
                      </FormControl>
                      <FormLabel className="font-normal">Yes</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="no" />
                      </FormControl>
                      <FormLabel className="font-normal">No</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchHasExistingMortgage === 'yes' && (
            <div className="space-y-4 border-l-2 border-mortgage-purple pl-4">
              <FormField
                control={form.control}
                name="currentRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Interest Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="4.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Monthly Payment ($)</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="1,500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

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

export default MortgageInfoStep;
