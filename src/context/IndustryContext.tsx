
import React, { createContext, useContext, useState, ReactNode } from "react";

export type IndustryType = "mortgage" | "realEstate" | null;

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
  // Initialize state from localStorage or default to null
  const [activeIndustry, setActiveIndustryState] = useState<IndustryType>(() => {
    const savedIndustry = localStorage.getItem("activeIndustry");
    // Convert string from localStorage to IndustryType
    return savedIndustry === "mortgage" ? "mortgage" : 
           savedIndustry === "real_estate" ? "realEstate" : null;
  });

  // Update localStorage when activeIndustry changes
  const setActiveIndustry = (industry: IndustryType) => {
    setActiveIndustryState(industry);
    if (industry) {
      // Convert IndustryType to string for localStorage
      const storageValue = industry === "mortgage" ? "mortgage" : "real_estate";
      localStorage.setItem("activeIndustry", storageValue);
    } else {
      localStorage.removeItem("activeIndustry");
    }
  };

  return (
    <IndustryContext.Provider value={{ activeIndustry, setActiveIndustry }}>
      {children}
    </IndustryContext.Provider>
  );
};
