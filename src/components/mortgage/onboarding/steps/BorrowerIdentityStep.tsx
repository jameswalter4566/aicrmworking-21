
import React from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadProfile } from "@/services/leadProfile";

interface BorrowerIdentityStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

const BorrowerIdentityStep = ({ leadData, onSave }: BorrowerIdentityStepProps) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      month: "",
      day: "",
      year: "",
      ssn1: "",
      ssn2: "",
      ssn3: "",
      contactConsent: false,
      creditConsent: false,
    }
  });

  const watchAllFields = watch();
  
  const onSubmit = (values: any) => {
    // Format date as ISO string (YYYY-MM-DD)
    const dateOfBirth = `${values.year}-${values.month.padStart(2, '0')}-${values.day.padStart(2, '0')}`;
    
    // Format SSN with dashes (XXX-XX-XXXX)
    const socialSecurityNumber = `${values.ssn1}-${values.ssn2}-${values.ssn3}`;
    
    const updatedData: Partial<LeadProfile> = {
      mortgageData: {
        ...(leadData.mortgageData || {}),
        borrower: {
          ...(leadData.mortgageData?.borrower || {}),
          dateOfBirth,
          socialSecurityNumber
        }
      }
    };
    
    onSave(updatedData);
  };
  
  const isFormComplete = 
    watchAllFields.month && 
    watchAllFields.day && 
    watchAllFields.year && 
    watchAllFields.ssn1 && 
    watchAllFields.ssn2 && 
    watchAllFields.ssn3 && 
    watchAllFields.contactConsent && 
    watchAllFields.creditConsent;

  return (
    <form
      className="max-w-md mx-auto space-y-8 pt-6"
      onSubmit={handleSubmit(onSubmit)}
    >
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-[#1769aa]">
        Your Birthdate
      </h2>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="month">Month of Birth</Label>
          <Input
            id="month"
            placeholder="Month"
            {...register("month", { required: true, pattern: /^(0?[1-9]|1[0-2])$/ })}
          />
          {errors.month && (
            <span className="text-red-500 text-sm">Valid month required (1-12)</span>
          )}
        </div>
        <div>
          <Label htmlFor="day">Day of Birth</Label>
          <Input
            id="day"
            placeholder="Day"
            {...register("day", { required: true, pattern: /^(0?[1-9]|[12][0-9]|3[01])$/ })}
          />
          {errors.day && (
            <span className="text-red-500 text-sm">Valid day required (1-31)</span>
          )}
        </div>
        <div>
          <Label htmlFor="year">Year of Birth</Label>
          <Input
            id="year"
            placeholder="Year"
            {...register("year", { 
              required: true, 
              pattern: /^\d{4}$/,
              validate: value => parseInt(value) < new Date().getFullYear() - 18 || "Must be at least 18 years old"
            })}
          />
          {errors.year && (
            <span className="text-red-500 text-sm">Valid year required</span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-1">We use your birthdate to verify your identity.</p>
      
      <div>
        <h3 className="text-lg font-semibold text-[#1769aa] mb-3">
          Your Social Security Number (or ITIN)
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-24">
            <Input
              type="password"
              placeholder="First 3"
              {...register("ssn1", { required: true, pattern: /^\d{3}$/ })}
            />
          </div>
          <span className="text-gray-500">-</span>
          <div className="w-16">
            <Input
              type="password"
              placeholder="Middle 2"
              {...register("ssn2", { required: true, pattern: /^\d{2}$/ })}
            />
          </div>
          <span className="text-gray-500">-</span>
          <div className="w-24">
            <Input
              type="password"
              placeholder="Last 4"
              {...register("ssn3", { required: true, pattern: /^\d{4}$/ })}
            />
          </div>
        </div>
        {(errors.ssn1 || errors.ssn2 || errors.ssn3) && (
          <span className="text-red-500 text-sm block mt-1">Please enter a valid SSN format</span>
        )}
        <p className="text-sm text-gray-500 mt-2">
          Don't worry, this is private and is needed to securely complete the application process.
        </p>
      </div>
      
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-[#1769aa]">
          Acknowledgement & Authorization
        </h3>
        
        <div className="flex space-x-2">
          <Checkbox 
            id="contactConsent" 
            {...register("contactConsent", { required: true })}
          />
          <Label className="text-sm" htmlFor="contactConsent">
            I authorize Turbo Insurance Group to contact me (including text messages, carrier fees may apply) at the number provided, 
            regarding placement of insurance products. I may revoke my consent at any point by emailing support@turboinsurancegroup.com 
            or by calling 877-714-1000. I understand that I am not required to give my consent as a condition of purchasing any goods or services, 
            rather I am opting into a service to assist in obtaining insurance policies on my behalf for review and acceptance separately.
          </Label>
        </div>
        
        <div className="flex space-x-2">
          <Checkbox 
            id="creditConsent" 
            {...register("creditConsent", { required: true })}
          />
          <Label className="text-sm" htmlFor="creditConsent">
            I allow my credit report to be accessed by Mortgagesalespro.com
          </Label>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-[#1769aa] text-white hover:bg-[#145089] text-lg rounded-xl py-4 mt-6"
      >
        Continue
      </Button>
    </form>
  );
};

export default BorrowerIdentityStep;
