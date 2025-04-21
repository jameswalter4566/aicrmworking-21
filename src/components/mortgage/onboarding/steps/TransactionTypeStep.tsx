
// Fixed imports for lucide-react icons (case-sensitive)
import React from "react";
import { DollarSign, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

type TransactionType = "buy_home" | "refinance" | "cash_out";

interface TransactionTypeStepProps {
  selectedType: TransactionType | null;
  onSelect: (type: TransactionType) => void;
  leadData?: any;
}

const options = [
  {
    type: "buy_home" as TransactionType,
    icon: (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 mr-3">
        <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-700"><path d="M3 10L13 3l10 7" /><path d="M5 10v10a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h4a1 1 0 001-1V10" /><circle cx="8.5" cy="17.5" r="0.5" fill="currentColor" /></svg>
      </span>
    ),
    label: "Buying a home",
    description: null
  },
  {
    type: "refinance" as TransactionType,
    icon: (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 mr-3">
        <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-700"><path d="M3 10L13 3l10 7" /><path d="M5 10v10a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h4a1 1 0 001-1V10" /><path d="M9 15h6m-3 -3v6" /></svg>
      </span>
    ),
    label: "Refinance my mortgage",
    description: null
  },
  {
    type: "cash_out" as TransactionType,
    icon: (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 mr-3">
        <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-700"><circle cx="13" cy="13" r="9" /><path d="M13 9v6" /><path d="M13 17h.01" /><path d="M8 17V9a5 5 0 015-5h3" /></svg>
      </span>
    ),
    label: "Get cash from my home",
    description: null
  },
];

const TransactionTypeStep: React.FC<TransactionTypeStepProps> = ({
  selectedType,
  onSelect,
}) => {
  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
        What can I help you with?
      </h2>
      <div className="w-full max-w-lg flex flex-col gap-5 mb-8">
        {options.map(option => (
          <Button
            key={option.type}
            variant="outline"
            className={`flex items-center justify-start rounded-xl border-2 py-5 px-6 text-lg font-semibold transition-all duration-150
              ${selectedType === option.type ? "border-emerald-600 bg-emerald-50" : "border-gray-300 bg-white hover:border-emerald-300"}
            `}
            onClick={() => onSelect(option.type)}
            tabIndex={0}
            type="button"
          >
            {option.icon}
            {option.label}
          </Button>
        ))}
      </div>
      {/* Stats and info block */}
      <div className="flex flex-row flex-wrap gap-8 md:gap-16 mb-8 justify-center">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold">$100B</span>
          <span className="text-sm text-gray-600 mt-0.5">home loans funded<br />entirely online</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold">400K</span>
          <span className="text-sm text-gray-600 mt-0.5">Customers who chose a<br />Better Mortgage</span>
        </div>
      </div>
      <div className="rounded-xl p-5 bg-green-50 w-full max-w-lg flex flex-col items-center">
        <p className="font-medium text-emerald-800 mb-3">After a few questions, you'll unlock:</p>
        <ul className="text-emerald-900 text-base list-none space-y-1">
          <li className="flex items-center"><span className="mr-2">✓</span>Custom mortgage rates</li>
          <li className="flex items-center"><span className="mr-2">✓</span>Exclusive offers</li>
          <li className="flex items-center"><span className="mr-2">✓</span>A personalized dashboard</li>
        </ul>
      </div>
    </div>
  );
};

export default TransactionTypeStep;
