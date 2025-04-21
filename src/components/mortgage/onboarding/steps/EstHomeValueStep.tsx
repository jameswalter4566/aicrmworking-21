
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { LeadProfile } from "@/services/leadProfile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface EstHomeValueStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

// Helper – format number string with commas
function formatWithCommas(value: string) {
  // Remove all non-numeric except .
  const num = value.replace(/[^\d.]/g, "");
  if (num === "") return "";
  // Split decimals if present
  const [integer, decimal] = num.split(".");
  const withCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal !== undefined ? `${withCommas}.${decimal}` : withCommas;
}

// Helper – remove commas
function removeCommas(val: string) {
  return val.replace(/,/g, "");
}

const EstHomeValueStep = ({ leadData, onSave }: EstHomeValueStepProps) => {
  const defaultValue = leadData.mortgageData?.property?.propertyValue
    ? formatWithCommas(String(leadData.mortgageData?.property?.propertyValue))
    : "";

  const [displayValue, setDisplayValue] = useState<string>(defaultValue);

  const { handleSubmit, formState } = useForm({
    defaultValues: {
      mortgageData: {
        property: {
          propertyValue: removeCommas(defaultValue)
        }
      },
    },
  });

  return (
    <form
      onSubmit={handleSubmit(() => {
        // Always pass the unformatted value (no commas)
        onSave({
          mortgageData: {
            ...(leadData.mortgageData || {}),
            property: {
              ...(leadData.mortgageData?.property || {}),
              propertyValue: removeCommas(displayValue),
            },
          },
        });
      })}
      className="max-w-md mx-auto pt-10 space-y-8"
    >
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-[#1769aa]">
        What's your estimated home value?
      </h2>
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
            type="text"
            inputMode="numeric"
            maxLength={14}
            autoFocus
            className="bg-[#e7f0fa] text-black border-none text-xl px-0 focus:ring-0 font-bold focus:outline-none focus:border-[#1769aa]"
            style={{ boxShadow: "none" }}
            placeholder="100,000"
            value={displayValue}
            onChange={(e) => {
              const input = e.target.value;
              // Only allow digits and commas (and optional .)
              const formatted = formatWithCommas(input);
              setDisplayValue(formatted);
            }}
            required
            aria-label="Estimated Home Value"
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full bg-[#1769aa] text-white hover:bg-[#145089] text-lg rounded-xl py-6 mt-2 transition-colors"
        disabled={formState.isSubmitting || !displayValue}
      >
        Next
      </Button>
    </form>
  );
};

export default EstHomeValueStep;

