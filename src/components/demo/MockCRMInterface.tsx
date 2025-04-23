
import React from "react";
import { MockSidebar } from "./MockSidebar";
import { MockContent } from "./MockContent";

interface MockCRMInterfaceProps {
  industry: 'mortgage' | 'realEstate' | 'debtSettlement';
}

export const MockCRMInterface = ({ industry }: MockCRMInterfaceProps) => {
  return (
    <div className="flex h-[600px] w-[calc(100%-16px)] mx-2 mt-2 rounded-xl overflow-hidden border border-gray-200/30">
      <MockSidebar industry={industry} />
      <MockContent />
    </div>
  );
};
