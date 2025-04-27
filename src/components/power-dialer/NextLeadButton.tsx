
import React from 'react';
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

interface NextLeadButtonProps {
  onCallNext: () => void;
  isCallingNext: boolean;
  hasActiveCall: boolean;
}

export function NextLeadButton({ onCallNext, isCallingNext, hasActiveCall }: NextLeadButtonProps) {
  return (
    <Button
      onClick={onCallNext}
      disabled={isCallingNext}  // Only disable while transitioning
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
      size="sm"
    >
      <Phone className="mr-2 h-4 w-4" />
      {isCallingNext ? 'Transitioning...' : 'Call Next Lead'}
    </Button>
  );
}
