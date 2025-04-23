
import React from "react";
import { MockSidebar } from "./MockSidebar";
import { MockContent } from "./MockContent";

interface MockCRMInterfaceProps {
  industry: 'mortgage' | 'realEstate' | 'debtSettlement';
}

export const MockCRMInterface = ({ industry }: MockCRMInterfaceProps) => {
  return (
    <div className="flex h-[588px] w-[calc(100%-24px)] mx-3 mt-3">
      <MockSidebar industry={industry} />
      <MockContent />
    </div>
  );
};
