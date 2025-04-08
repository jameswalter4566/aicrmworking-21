
import React, { createContext, useContext, useState, ReactNode } from "react";

export type IndustryType = "mortgage" | "realEstate" | "debtSettlement" | null;

interface IndustryContextType {
  activeIndustry: IndustryType;
  setActiveIndustry: (industry: IndustryType) => void;
}

const IndustryContext = createContext<IndustryContextType | undefined>(undefined);

export const useIndustry = () => {
  const context = useContext(IndustryContext);
  if (context === undefined) {
    throw new Error("useIndustry must be used within an IndustryProvider");
  }
  return context;
};

interface IndustryProviderProps {
  children: ReactNode;
}

export const IndustryProvider: React.FC<IndustryProviderProps> = ({ children }) => {
  const [activeIndustry, setActiveIndustry] = useState<IndustryType>(null);

  return (
    <IndustryContext.Provider value={{ activeIndustry, setActiveIndustry }}>
      {children}
    </IndustryContext.Provider>
  );
};
