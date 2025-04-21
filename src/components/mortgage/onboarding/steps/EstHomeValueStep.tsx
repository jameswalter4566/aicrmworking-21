
import React from "react";
import { useForm } from "react-hook-form";
import { LeadProfile } from "@/services/leadProfile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface EstHomeValueStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

const EstHomeValueStep = ({ leadData, onSave }: EstHomeValueStepProps) => {
  const { register, handleSubmit, formState } = useForm({
    defaultValues: {
      mortgageData: {
        property: {
            propertyValue: leadData.mortgageData?.property?.propertyValue || ''
        }
      },
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => {
        // ensure numeric value
        const value = data.mortgageData?.property?.propertyValue;
        const parsedValue =
          typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;

        onSave({
          mortgageData: {
            ...(leadData.mortgageData || {}),
            property: {
              ...(leadData.mortgageData?.property || {}),
              propertyValue: parsedValue,
            },
          },
        });
      })}
      className="max-w-md mx-auto pt-10 space-y-8"
    >
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-[#1769aa]">What's your estimated home value?</h2>
      <div className="rounded-xl border border-[#b7d1ea] bg-[#e7f0fa] px-6 py-4 flex items-center gap-3 mb-2">
        <DollarSign size={28} className="text-[#1769aa]" />
        <div className="flex-1">
          <label
            htmlFor="propertyValue"
            className="block text-sm text-[#1769aa] font-semibold mb-1"
          >
            Estimated home value
          </label>
          <Input
            id="propertyValue"
            type="number"
            inputMode="numeric"
            maxLength={14}
            min={0}
            step="any"
            autoFocus
            className="bg-[#e7f0fa] text-black border-none text-xl px-0 focus:ring-0 font-bold focus:outline-none focus:border-[#1769aa]"
            style={{ boxShadow: "none" }}
            placeholder="100,000"
            {...register('mortgageData.property.propertyValue', { required: true })}
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full bg-[#1769aa] text-white hover:bg-[#145089] text-lg rounded-xl py-6 mt-2 transition-colors"
        disabled={formState.isSubmitting}
      >
        Next
      </Button>
    </form>
  );
};

export default EstHomeValueStep;
