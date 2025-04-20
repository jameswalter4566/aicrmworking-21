
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

interface PropertyInfoStepProps {
  leadData: LeadProfile;
  updateLeadData: (data: Partial<LeadProfile>) => Promise<boolean>;
  onNext: () => void;
  onPrevious: () => void;
}

const formSchema = z.object({
  propertyAddress: z.string().min(1, 'Property address is required'),
  propertyType: z.string().min(1, 'Property type is required'),
  propertyValue: z.string().min(1, 'Property value is required'),
  occupancy: z.string().min(1, 'Occupancy is required'),
});

const PropertyInfoStep = ({ leadData, updateLeadData, onNext, onPrevious }: PropertyInfoStepProps) => {
  const [isSaving, setIsSaving] = useState(false);
  
  const mortgageData = leadData.mortgageData || {};
  const propertyData = mortgageData.property || {};
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyAddress: leadData.propertyAddress || propertyData.subjectPropertyAddress || '',
      propertyType: propertyData.propertyType || '',
      propertyValue: propertyData.propertyValue?.toString() || '',
      occupancy: propertyData.occupancy || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSaving(true);

      // Update property data
      const currentMortgageData = leadData.mortgageData || {};
      
      const updatedMortgageData = {
        ...currentMortgageData,
        property: {
          ...(currentMortgageData.property || {}),
          subjectPropertyAddress: values.propertyAddress,
          propertyType: values.propertyType,
          propertyValue: values.propertyValue,
          occupancy: values.occupancy
        }
      };
      
      // Prepare data for update
      const updateData = {
        propertyAddress: values.propertyAddress,
        mortgageData: updatedMortgageData
      };
      
      const success = await updateLeadData(updateData);
      
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
        <h2 className="text-xl font-semibold">Property Information</h2>
        <p className="text-gray-600">
          Please tell us about the property you're financing.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="propertyAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Address</FormLabel>
                <FormControl>
                  <Input placeholder="123 Main Street, City, State, ZIP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="propertyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Single Family">Single Family</SelectItem>
                    <SelectItem value="Condo">Condominium</SelectItem>
                    <SelectItem value="Townhouse">Townhouse</SelectItem>
                    <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                    <SelectItem value="Manufactured Home">Manufactured Home</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="propertyValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Property Value ($)</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="300,000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="occupancy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Occupancy</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select occupancy type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Primary Residence">Primary Residence</SelectItem>
                    <SelectItem value="Second Home">Second Home</SelectItem>
                    <SelectItem value="Investment Property">Investment Property</SelectItem>
                  </SelectContent>
                </Select>
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

export default PropertyInfoStep;
