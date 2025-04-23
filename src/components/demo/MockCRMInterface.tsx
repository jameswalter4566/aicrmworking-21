
import React from "react";
import { MockSidebar } from "./MockSidebar";
import { MockContent } from "./MockContent";

interface MockCRMInterfaceProps {
  industry: 'mortgage' | 'realEstate' | 'debtSettlement';
}

export const MockCRMInterface = ({ industry }: MockCRMInterfaceProps) => {
  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200 flex w-full">
      <MockSidebar industry={industry} />
      <MockContent />
    </div>
  );
};
