
import React from "react";
import { MockSidebar } from "./MockSidebar";
import { MockContent } from "./MockContent";

interface MockCRMInterfaceProps {
  industry: 'mortgage' | 'realEstate' | 'debtSettlement';
}

export const MockCRMInterface = ({ industry }: MockCRMInterfaceProps) => {
  return (
    <div className="flex h-[900px] w-[calc(100%-8px)] mx-1 mt-1 rounded-xl overflow-hidden border border-gray-200/30">
      <MockSidebar industry={industry} />
      <MockContent />
    </div>
  );
};
