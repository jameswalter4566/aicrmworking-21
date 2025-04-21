
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LeadProfile } from "@/services/leadProfile";

interface MaritalStatusStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

const MARITAL_OPTIONS = [
  { value: "unmarried", label: "Unmarried" },
  { value: "married_applying_with_spouse", label: "Married and I will be applying with my spouse" },
  { value: "married_not_applying_with_spouse", label: "Married and I will not be applying with my spouse" },
];

const MaritalStatusStep = ({ leadData, onSave }: MaritalStatusStepProps) => {
  const defaultStatus = leadData.mortgageData?.borrower?.maritalStatus || "";
  
  // Initialize spouse data with empty values
  const defaultSpouse = {
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: ""
  };

  const { register, watch, handleSubmit, formState } = useForm({
    defaultValues: {
      maritalStatus: defaultStatus,
      spouseFirstName: defaultSpouse.firstName,
      spouseMiddleName: defaultSpouse.middleName,
      spouseLastName: defaultSpouse.lastName,
      spouseEmail: defaultSpouse.email,
      spousePhone: defaultSpouse.phone,
    },
  });

  const maritalStatus = watch("maritalStatus");

  return (
    <form
      className="max-w-md mx-auto space-y-8 pt-6"
      onSubmit={handleSubmit((values) => {
        const result: Partial<LeadProfile> = {
          mortgageData: {
            ...(leadData.mortgageData || {}),
            borrower: {
              ...(leadData.mortgageData?.borrower || {}),
              maritalStatus: values.maritalStatus,
            },
          },
        };
        
        if (values.maritalStatus === "married_applying_with_spouse") {
          // We need to add spouse information somewhere in the mortgageData structure
          // Since there's no direct coBorrower field in the type, let's add it to an appropriate place
          result.mortgageData = {
            ...result.mortgageData,
            spouse: {
              firstName: values.spouseFirstName,
              middleName: values.spouseMiddleName,
              lastName: values.spouseLastName,
              email: values.spouseEmail,
              phone: values.spousePhone,
            }
          };
        }
        
        onSave(result);
      })}
    >
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-[#1769aa]">
        Are You Married?
      </h2>

      <div className="space-y-4">
        {MARITAL_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <input
              type="radio"
              value={opt.value}
              {...register("maritalStatus", { required: true })}
              className="accent-[#1769aa] h-5 w-5"
            />
            <span className="text-base">{opt.label}</span>
          </label>
        ))}
        {formState.errors.maritalStatus && (
          <span className="text-red-500 text-sm">Select an option</span>
        )}
      </div>

      {maritalStatus === "married_applying_with_spouse" && (
        <>
          <h3 className="text-xl font-semibold text-[#1769aa] mt-4">
            What Is Your Spouse's Name?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div>
              <Label htmlFor="spouseFirstName">First Name</Label>
              <Input
                id="spouseFirstName"
                placeholder="First name"
                {...register("spouseFirstName", { required: true })}
              />
              {formState.errors.spouseFirstName && (
                <span className="text-red-500 text-sm">Required</span>
              )}
            </div>
            <div>
              <Label htmlFor="spouseMiddleName">Middle Name</Label>
              <Input
                id="spouseMiddleName"
                placeholder="Middle name"
                {...register("spouseMiddleName")}
              />
            </div>
            <div>
              <Label htmlFor="spouseLastName">Last Name</Label>
              <Input
                id="spouseLastName"
                placeholder="Last name"
                {...register("spouseLastName", { required: true })}
              />
              {formState.errors.spouseLastName && (
                <span className="text-red-500 text-sm">Required</span>
              )}
            </div>
          </div>
          <div className="mb-2">
            <Label htmlFor="spouseEmail">Spouse Email</Label>
            <Input
              id="spouseEmail"
              placeholder="email@domain.com"
              type="email"
              {...register("spouseEmail", { required: true })}
            />
            {formState.errors.spouseEmail && (
              <span className="text-red-500 text-sm">Required</span>
            )}
            <span className="block text-xs text-muted-foreground mt-1">
              Your co-borrower will receive an email requesting authorization to be on this loan.
            </span>
          </div>
          <div>
            <Label htmlFor="spousePhone">Spouse Primary Phone Number</Label>
            <Input
              id="spousePhone"
              placeholder="Spouse Phone"
              type="tel"
              {...register("spousePhone", { required: true })}
            />
            {formState.errors.spousePhone && (
              <span className="text-red-500 text-sm">Required</span>
            )}
          </div>
        </>
      )}

      <Button
        type="submit"
        className="w-full bg-[#1769aa] text-white hover:bg-[#145089] text-lg rounded-xl py-4 mt-6"
      >
        Continue
      </Button>
    </form>
  );
};

export default MaritalStatusStep;
