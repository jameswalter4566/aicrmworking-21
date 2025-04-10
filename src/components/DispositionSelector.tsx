
import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type DispositionOption = {
  value: string;
  label: string;
  color: string;
  bgColor: string;
  hoverColor: string;
};

const dispositionOptions: DispositionOption[] = [
  {
    value: "Not Contacted",
    label: "Not Contacted",
    color: "text-gray-800",
    bgColor: "bg-gray-100",
    hoverColor: "hover:bg-gray-200"
  },
  {
    value: "Contacted",
    label: "Contacted",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
    hoverColor: "hover:bg-blue-200"
  },
  {
    value: "Appointment Set",
    label: "Appointment",
    color: "text-purple-800",
    bgColor: "bg-purple-100",
    hoverColor: "hover:bg-purple-200"
  },
  {
    value: "Submitted",
    label: "Submitted",
    color: "text-green-800",
    bgColor: "bg-green-100", 
    hoverColor: "hover:bg-green-200"
  },
  {
    value: "Dead",
    label: "Dead",
    color: "text-red-800",
    bgColor: "bg-red-100",
    hoverColor: "hover:bg-red-200"
  },
  {
    value: "DNC",
    label: "DNC",
    color: "text-yellow-800",
    bgColor: "bg-yellow-100",
    hoverColor: "hover:bg-yellow-200"
  }
];

interface DispositionSelectorProps {
  currentDisposition: string;
  onDispositionChange: (disposition: string) => void;
  disabled?: boolean;
}

const DispositionSelector: React.FC<DispositionSelectorProps> = ({ 
  currentDisposition, 
  onDispositionChange,
  disabled = false
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {dispositionOptions.map((option) => {
        const isActive = currentDisposition === option.value;
        
        return (
          <Button
            key={option.value}
            onClick={() => onDispositionChange(option.value)}
            disabled={disabled}
            variant="outline"
            className={`
              transition-all duration-200 border
              ${isActive 
                ? `${option.bgColor} ${option.color} border-current` 
                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}
              flex items-center gap-1
            `}
            size="sm"
          >
            {isActive && <Check className="h-3 w-3" />}
            {option.label}
          </Button>
        );
      })}
    </div>
  );
};

export default DispositionSelector;
