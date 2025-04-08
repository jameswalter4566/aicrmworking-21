
import React, { createContext, useState, useContext, ReactNode } from "react";

export type IndustryType = "mortgage" | "realEstate" | "debtSettlement" | null;

interface IndustryContextType {
  activeIndustry: IndustryType;
  setActiveIndustry: (industry: IndustryType) => void;
  industryName: string;
  industryColor: string;
}

const defaultContext: IndustryContextType = {
  activeIndustry: null,
  setActiveIndustry: () => {},
  industryName: "",
  industryColor: "bg-crm-blue", // Default color
};

const IndustryContext = createContext<IndustryContextType>(defaultContext);

export const useIndustry = () => useContext(IndustryContext);

interface IndustryProviderProps {
  children: ReactNode;
}

export const IndustryProvider = ({ children }: IndustryProviderProps) => {
  const [activeIndustry, setActiveIndustry] = useState<IndustryType>(null);

  // Get the display name based on active industry
  const getIndustryName = (): string => {
    switch (activeIndustry) {
      case "mortgage":
        return "Mortgage";
      case "realEstate":
        return "Real Estate";
      case "debtSettlement":
        return "Debt Settlement";
      default:
        return "";
    }
  };

  // Get the color class based on active industry
  const getIndustryColor = (): string => {
    switch (activeIndustry) {
      case "mortgage":
        return "bg-blue-500";
      case "realEstate":
        return "bg-green-500";
      case "debtSettlement":
        return "bg-purple-500";
      default:
        return "bg-crm-blue";
    }
  };

  return (
    <IndustryContext.Provider
      value={{
        activeIndustry,
        setActiveIndustry,
        industryName: getIndustryName(),
        industryColor: getIndustryColor(),
      }}
    >
      {children}
    </IndustryContext.Provider>
  );
};
