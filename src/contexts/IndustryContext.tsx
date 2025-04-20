
import React, { createContext, useState, useContext } from "react";

interface IndustryContextProps {
  industry: string;
  setIndustry: (industry: string) => void;
}

const IndustryContext = createContext<IndustryContextProps>({
  industry: 'mortgage',
  setIndustry: () => {}
});

export const IndustryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [industry, setIndustry] = useState('mortgage');

  return (
    <IndustryContext.Provider value={{ industry, setIndustry }}>
      {children}
    </IndustryContext.Provider>
  );
};

export const useIndustry = () => useContext(IndustryContext);
