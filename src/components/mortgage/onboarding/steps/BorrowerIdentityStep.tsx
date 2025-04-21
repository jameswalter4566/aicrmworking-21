
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadProfile } from "@/services/leadProfile";
import { Eye, EyeOff } from "lucide-react";

interface BorrowerIdentityStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

interface FormData {
  dobMonth: string;
  dobDay: string;
  dobYear: string;
  ssn1: string;
  ssn2: string;
  ssn3: string;
  turboConsent: boolean;
  creditConsent: boolean;
}

const BorrowerIdentityStep = ({ leadData, onSave }: BorrowerIdentityStepProps) => {
  // Read defaults from leadData.mortgageData?.borrower, fallback empty string
  const borrower = leadData.mortgageData?.borrower || {};
  let birthDate = borrower.dateOfBirth || "";
  let birthParts = birthDate ? birthDate.split("-") : ["", "", ""];
  if (birthParts.length === 3) {
    birthParts = [birthParts[1], birthParts[2], birthParts[0]]; // [mm, dd, yyyy]
  } else {
    birthParts = ["", "", ""];
  }

  // SSN masked input logic
  const initialSSN = borrower.socialSecurityNumber || "";
  const ssnParts = initialSSN ? (initialSSN.split("-").length === 3 ? initialSSN.split("-") : ["", "", ""]) : ["", "", ""];

  const [showSSN, setShowSSN] = useState(false);

  const { register, handleSubmit, formState, watch } = useForm<FormData>({
    mode: "onChange", // This makes validation run on change
    defaultValues: {
      dobMonth: birthParts[0],
      dobDay: birthParts[1],
      dobYear: birthParts[2],
      ssn1: ssnParts[0],
      ssn2: ssnParts[1],
      ssn3: ssnParts[2],
      turboConsent: false,
      creditConsent: false,
    },
  });

  const onSubmit = (values: FormData) => {
    const dob =
      values.dobYear && values.dobMonth && values.dobDay
        ? `${values.dobYear.padStart(4, "0")}-${values.dobMonth.padStart(2, "0")}-${values.dobDay.padStart(2, "0")}`
        : "";
    const ssn =
      values.ssn1 && values.ssn2 && values.ssn3
        ? `${values.ssn1}-${values.ssn2}-${values.ssn3}`
        : "";
    const result: Partial<LeadProfile> = {
      mortgageData: {
        ...(leadData.mortgageData || {}),
        borrower: {
          ...(leadData.mortgageData?.borrower || {}),
          dateOfBirth: dob,
          socialSecurityNumber: ssn,
        },
      },
    };
    onSave(result);
  };

  return (
    <form className="max-w-md mx-auto space-y-8 pt-6" onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-[#1769aa]">Your Birthdate</h2>
      <p className="text-center text-muted-foreground mb-2">
        We use your birthdate to verify your identity.
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="dobMonth">Month</Label>
          <Input 
            id="dobMonth" 
            placeholder="MM" 
            maxLength={2} 
            {...register("dobMonth", { 
              required: true, 
              minLength: 1,
              pattern: /^(0?[1-9]|1[0-2])$/
            })} 
          />
          {formState.errors.dobMonth && <span className="text-red-500 text-xs">Required</span>}
        </div>
        <div>
          <Label htmlFor="dobDay">Day</Label>
          <Input 
            id="dobDay" 
            placeholder="DD" 
            maxLength={2} 
            {...register("dobDay", { 
              required: true, 
              minLength: 1,
              pattern: /^(0?[1-9]|[12]\d|3[01])$/ 
            })} 
          />
          {formState.errors.dobDay && <span className="text-red-500 text-xs">Required</span>}
        </div>
        <div>
          <Label htmlFor="dobYear">Year</Label>
          <Input 
            id="dobYear" 
            placeholder="YYYY" 
            maxLength={4} 
            {...register("dobYear", { 
              required: true, 
              minLength: 4,
              pattern: /^\d{4}$/
            })} 
          />
          {formState.errors.dobYear && <span className="text-red-500 text-xs">Required</span>}
        </div>
      </div>

      <h3 className="text-xl font-semibold text-[#1769aa] mt-4">Your Social Security Number (or ITIN)</h3>
      <div className="flex items-end gap-2">
        <div>
          <Label htmlFor="ssn1" className="sr-only">First 3</Label>
          <Input
            id="ssn1"
            placeholder="123"
            maxLength={3}
            type={showSSN ? "text" : "password"}
            autoComplete="off"
            {...register("ssn1", { required: true, minLength: 3, maxLength: 3, pattern: /^\d{3}$/ })}
          />
        </div>
        <span>-</span>
        <div>
          <Label htmlFor="ssn2" className="sr-only">Middle 2</Label>
          <Input
            id="ssn2"
            placeholder="45"
            maxLength={2}
            type={showSSN ? "text" : "password"}
            autoComplete="off"
            {...register("ssn2", { required: true, minLength: 2, maxLength: 2, pattern: /^\d{2}$/ })}
          />
        </div>
        <span>-</span>
        <div>
          <Label htmlFor="ssn3" className="sr-only">Last 4</Label>
          <Input
            id="ssn3"
            placeholder="6789"
            maxLength={4}
            type={showSSN ? "text" : "password"}
            autoComplete="off"
            {...register("ssn3", { required: true, minLength: 4, maxLength: 4, pattern: /^\d{4}$/ })}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-2"
          onClick={() => setShowSSN((s) => !s)}
          aria-label={showSSN ? "Hide SSN" : "Show SSN"}
        >
          {showSSN ? <EyeOff size={20} /> : <Eye size={20} />}
        </Button>
      </div>
      <span className="block text-xs text-muted-foreground mt-1">
        Don't worry, this is private and is needed to securely complete the application process.
      </span>
      {(formState.errors.ssn1 || formState.errors.ssn2 || formState.errors.ssn3) && (
        <span className="text-red-500 text-xs">All SSN fields are required</span>
      )}
      <div className="mt-6">
        <div className="flex items-start space-x-2">
          <Checkbox 
            id="turbo-consent" 
            {...register("turboConsent", { required: true })}
          />
          <Label htmlFor="turbo-consent" className="text-sm">
            I authorize Turbo Insurance Group to contact me (including text messages, carrier fees may apply) at the number provided, regarding placement of insurance products. I may revoke my consent at any point by emailing <a href="mailto:support@turboinsurancegroup.com" className="underline text-blue-600">support@turboinsurancegroup.com</a> or by calling 877-714-1000. I understand that I am not required to give my consent as a condition of purchasing any goods or services, rather I am opting into a service to assist in obtaining insurance policies on my behalf for review and acceptance separately.
          </Label>
        </div>
        {formState.errors.turboConsent && (
          <span className="text-red-500 text-xs ml-6">Required</span>
        )}
      </div>
      <div className="mt-2">
        <div className="flex items-start space-x-2">
          <Checkbox 
            id="credit-consent" 
            {...register("creditConsent", { required: true })}
          />
          <Label htmlFor="credit-consent" className="text-sm">
            I allow my credit report to be accessed by Mortgagesalespro.com
          </Label>
        </div>
        {formState.errors.creditConsent && (
          <span className="text-red-500 text-xs ml-6">Required</span>
        )}
      </div>
      <Button
        type="submit"
        className="w-full bg-[#1769aa] text-white hover:bg-[#145089] text-lg rounded-xl py-4 mt-6"
        disabled={!formState.isValid || formState.isSubmitting}
      >
        Continue
      </Button>
    </form>
  );
};

export default BorrowerIdentityStep;
