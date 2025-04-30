
import React from "react";
import { MockSidebar } from "./MockSidebar";
import { MockContent } from "./MockContent";

interface MockCRMInterfaceProps {
  industry: 'mortgage' | 'realEstate' | 'debtSettlement';
}

export const MockCRMInterface = ({ industry }: MockCRMInterfaceProps) => {
  return (
    <div className="flex flex-col sm:flex-row h-auto sm:h-[900px] w-full max-w-full overflow-hidden border border-gray-200/30 rounded-xl">
      <div className="w-full sm:w-auto sm:flex-shrink-0">
        <MockSidebar industry={industry} />
      </div>
      <div className="flex-1 bg-white rounded-b-xl sm:rounded-b-none sm:rounded-tr-xl">
        <MockContent industry={industry} />
      </div>
    </div>
  );
};
