
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

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
  // Initialize from localStorage or default to null
  const [activeIndustry, setActiveIndustryState] = useState<IndustryType>(() => {
    const savedIndustry = localStorage.getItem("activeIndustry");
    return savedIndustry ? JSON.parse(savedIndustry) : null;
  });

  // Custom setter that updates both state and localStorage
  const setActiveIndustry = (industry: IndustryType) => {
    setActiveIndustryState(industry);
    localStorage.setItem("activeIndustry", JSON.stringify(industry));
  };

  return (
    <IndustryContext.Provider value={{ activeIndustry, setActiveIndustry }}>
      {children}
    </IndustryContext.Provider>
  );
};
